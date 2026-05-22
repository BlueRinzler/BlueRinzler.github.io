// ------------------------------------------------
// Configuration – adjust the URLs to your files
// ------------------------------------------------
const CSV_FILES = {
  consolidation: 'data/consolidation_symbols.csv',
  momentum: 'data/momentum_symbols.csv'
};
// ------------------------------------------------
// Column display configuration for each table
// ------------------------------------------------
let COLUMN_CONFIGS;
COLUMN_CONFIGS = {
    consolidation: [
        {field: 'symbol', label: 'Symbol'},
        {field: 'industry', label: 'Industry'},
        {field: 'close', label: 'Close'},
        {field: 'adr_percent', label: 'ADR %'},
        {field: '$Volume', label: 'Avg $Volume'},
        {field: '%1Month_rank', label: '1M Rank'},
        {field: '%3Month_rank', label: '3M Rank'},
        {field: '%6Month_rank', label: '6M Rank'},
        {field: '%Year_rank', label: 'Year Rank'},
        {field: 'sector_rank', label: 'Sector Rank'}
    ],
    momentum: [
        {field: 'symbol', label: 'Symbol'},
        {field: 'industry', label: 'Industry'},
        {field: 'close', label: 'Close'},
        {field: 'adr_percent', label: 'ADR %'},
        {field: '$Volume', label: 'Avg $Volume'},
        {field: '%1Month_rank', label: '1M Rank'},
        {field: '%3Month_rank', label: '3M Rank'},
        {field: '%6Month_rank', label: '6M Rank'},
        {field: '%Year_rank', label: 'Year Rank'},
        {field: 'sector_rank', label: 'Sector Rank'}
    ]
};

// Global storage for parsed data (array of objects)
const dataStore = {
  consolidation: [],
  momentum: []
};

// Current active tab
let activeTab = 'consolidation';

// ------------------------------------------------
// Utility: Build a sortable HTML table from an array of objects
// ------------------------------------------------
function buildTable(data, containerId) {
  const container = document.getElementById(containerId);
  if (!data.length) {
    container.innerHTML = '<p>No data loaded.</p>';
    return;
  }

  // Determine which key (e.g., 'consolidation') from the container ID
  const tableKey = containerId.replace('table-', '');
  const config = COLUMN_CONFIGS[tableKey];

  // Build the list of columns (fields) and their display labels
  let displayColumns, displayLabels;
  if (config && config.length > 0) {
    displayColumns = config.map(col => col.field);
    displayLabels  = config.map(col => col.label);
  } else {
    // Default: all columns from data, headers as-is
    displayColumns = Object.keys(data[0]);
    displayLabels  = displayColumns;
  }

  // Create table element
  const table = document.createElement('table');
  table.id = `table-${containerId}`;

  // Header row with click-to-sort
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  displayColumns.forEach((field, idx) => {
    const th = document.createElement('th');
    th.textContent = displayLabels[idx];
    th.dataset.column = field;   // keep original field name for sorting
    th.addEventListener('click', () => sortTable(table, field));
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Table body
  const tbody = document.createElement('tbody');
  renderTableRows(tbody, data, displayColumns);
  table.appendChild(tbody);

  // Replace old content
  container.innerHTML = '';
  container.appendChild(table);

  // Store columns metadata for filtering & sorting
  table.dataset.columns = JSON.stringify(displayColumns);
}

function renderTableRows(tbody, data, columns) {
  tbody.innerHTML = '';
  data.forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(field => {
      const td = document.createElement('td');
      let val = row[field];
      if (typeof val === 'number') {
        val = val.toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
      td.textContent = val ?? '';
      // Add full value as tooltip (even if not visibly truncated, harmless)
      td.title = val ?? '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// ------------------------------------------------
// Sorting logic (client-side, works on current displayed rows)
// ------------------------------------------------
let sortState = {}; // per table: { column: string, direction: 'asc'|'desc' }

function sortTable(table, column) {
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const columns = JSON.parse(table.dataset.columns);
  const colIndex = columns.indexOf(column);

  // Determine sort direction
  const key = table.id;
  if (!sortState[key] || sortState[key].column !== column) {
    sortState[key] = { column, direction: 'asc' };
  } else {
    sortState[key].direction = sortState[key].direction === 'asc' ? 'desc' : 'asc';
  }

  const direction = sortState[key].direction;

  // Sort rows based on cell content
  rows.sort((a, b) => {
    let aVal = a.children[colIndex]?.textContent || '';
    let bVal = b.children[colIndex]?.textContent || '';

    // Attempt numeric sort
    const aNum = parseFloat(aVal.replace(/,/g, ''));
    const bNum = parseFloat(bVal.replace(/,/g, ''));
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return direction === 'asc' ? aNum - bNum : bNum - aNum;
    }
    // Fallback to string comparison
    return direction === 'asc'
      ? aVal.localeCompare(bVal)
      : bVal.localeCompare(aVal);
  });

  // Re-append sorted rows
  rows.forEach(row => tbody.appendChild(row));

  // Update header indicators (optional)
  // You can add ▲/▼ to the clicked header
}

// ------------------------------------------------
// Search / filter across all columns (case-insensitive)
// ------------------------------------------------
function filterTable(tableId, query) {
  const table = document.getElementById(`table-${tableId}`);
  if (!table) return;
  const tbody = table.querySelector('tbody');
  const rows = tbody.querySelectorAll('tr');
  const lowerQuery = query.toLowerCase();

  rows.forEach(row => {
    const text = Array.from(row.children)
      .map(td => td.textContent.toLowerCase())
      .join(' ');
    row.style.display = text.includes(lowerQuery) ? '' : 'none';
  });
}

// ------------------------------------------------
// Tab switching
// ------------------------------------------------
function switchTab(tabName) {
  // Update buttons
  document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');

  // Update containers
  document.querySelectorAll('.table-container').forEach(div => div.classList.remove('active'));
  document.getElementById(`table-${tabName}`).classList.add('active');

  activeTab = tabName;

  // Re-apply search filter to the newly visible table
  const searchQuery = document.getElementById('search').value;
  if (searchQuery) {
    filterTable(tabName, searchQuery);
  }
}

// ------------------------------------------------
// Load CSV and store data
// ------------------------------------------------
async function loadCSV(fileKey) {
  const url = CSV_FILES[fileKey];
  // Cache-busting: add today's date so you always get the latest daily file
  const cacheBuster = `?v=${new Date().toISOString().slice(0,10)}`;
  try {
    const response = await fetch(url + cacheBuster);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,  // automatically convert numbers
        skipEmptyLines: true,
        complete: results => {
          dataStore[fileKey] = results.data;
          resolve();
        },
        error: err => reject(err)
      });
    });
  } catch (error) {
    console.error(`Failed to load ${fileKey}:`, error);
    // Optionally show an error message in the respective table container
    document.getElementById(`table-${fileKey}`).innerHTML = 
      `<p style="color:red">Error loading data: ${error.message}</p>`;
  }
}

// ------------------------------------------------
// Initialisation
// ------------------------------------------------
async function init() {
  // Load both files concurrently
  await Promise.all([
    loadCSV('consolidation'),
    loadCSV('momentum')
  ]);

  // Build tables
  buildTable(dataStore.consolidation, 'table-consolidation');
  buildTable(dataStore.momentum, 'table-momentum');

  // Set up tab button listeners
  document.getElementById('tab-consolidation').addEventListener('click', () => switchTab('consolidation'));
  document.getElementById('tab-momentum').addEventListener('click', () => switchTab('momentum'));

  // Search input handler
  const searchInput = document.getElementById('search');
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    // Filter the currently active table
    filterTable(activeTab, query);
  });

  // Activate default tab (consolidation already visible)
  switchTab('consolidation');
}

// Kick off
init();