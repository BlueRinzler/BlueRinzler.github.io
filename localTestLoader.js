// localTestLoader.js – Robust local CSV loader with visible feedback

(function() {
  // ----- UI elements -----
  const container = document.createElement('div');
  container.id = 'local-file-picker';
  container.innerHTML = `
    <div style="margin:1rem 0; padding:0.8rem; background:#f0f4ff; border:1px dashed #3182ce; border-radius:4px;">
      <strong>📁 Local Test Mode</strong><br>
      <label>Consolidation CSV: <input type="file" id="file-consolidation" accept=".csv"></label>
      <span id="status-consolidation" style="margin-left:1rem;"></span><br>
      <label>Momentum CSV: <input type="file" id="file-momentum" accept=".csv"></label>
      <span id="status-momentum" style="margin-left:1rem;"></span><br>
      <button id="btn-load-files" style="margin-top:0.5rem; padding:0.3rem 1rem;">Load Tables</button>
      <span id="load-message" style="margin-left:1rem; color:#d97706;"></span>
    </div>
  `;
  document.body.insertBefore(container, document.body.firstChild);

  // ----- Store selected files -----
  const fileStore = { consolidation: null, momentum: null };

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsText(file);
    });
  }

  function setStatus(key, text, color = '#333') {
    const span = document.getElementById(`status-${key}`);
    if (span) {
      span.textContent = text;
      span.style.color = color;
    }
  }

  // File selection listeners
  document.getElementById('file-consolidation').addEventListener('change', (e) => {
    if (e.target.files.length) {
      fileStore.consolidation = e.target.files[0];
      setStatus('consolidation', `✅ ${e.target.files[0].name}`, 'green');
    } else {
      fileStore.consolidation = null;
      setStatus('consolidation', '');
    }
  });

  document.getElementById('file-momentum').addEventListener('change', (e) => {
    if (e.target.files.length) {
      fileStore.momentum = e.target.files[0];
      setStatus('momentum', `✅ ${e.target.files[0].name}`, 'green');
    } else {
      fileStore.momentum = null;
      setStatus('momentum', '');
    }
  });

  // ----- Load and parse both files when button clicked -----
  document.getElementById('btn-load-files').addEventListener('click', async () => {
    const msgEl = document.getElementById('load-message');
    msgEl.textContent = 'Loading...';

    if (!fileStore.consolidation || !fileStore.momentum) {
      msgEl.textContent = '⚠️ Please select both CSV files first.';
      return;
    }

    if (typeof Papa === 'undefined') {
      msgEl.textContent = '❌ Papa Parse library not loaded. Check your internet or local copy.';
      return;
    }

    try {
      // Parse consolidation
      const text1 = await readFileAsText(fileStore.consolidation);
      const parse1 = await new Promise((resolve, reject) => {
        Papa.parse(text1, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: results => resolve(results.data),
          error: err => reject(err)
        });
      });
      dataStore.consolidation = parse1;

      // Parse momentum
      const text2 = await readFileAsText(fileStore.momentum);
      const parse2 = await new Promise((resolve, reject) => {
        Papa.parse(text2, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: results => resolve(results.data),
          error: err => reject(err)
        });
      });
      dataStore.momentum = parse2;

      // Build / rebuild tables
      buildTable(dataStore.consolidation, 'table-consolidation');
      buildTable(dataStore.momentum, 'table-momentum');

      // Re-activate current tab
      switchTab(activeTab);

      container.style.display = 'none';
      msgEl.textContent = '✅ Loaded successfully.';
    } catch (err) {
      console.error(err);
      msgEl.textContent = '❌ Error: ' + err.message;
    }
  });

  // Monkey-patch the original loadCSV to prevent HTTP fetch
  window.loadCSV = () => Promise.resolve();
})();