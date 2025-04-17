document.addEventListener('DOMContentLoaded', () => {
  const CSV_URL = 'data/productos.csv';
  const ITEMS_PER_PAGE = 25;
  const IVA_RATE = 0.16;

  let allProducts = [];
  let filteredProducts = [];
  let quote = [];
  let currentPage = 1;
  const productMap = new Map();

  const $ = id => document.getElementById(id);
  const loadingStatus = $('loading-status');
  const productCountInfo = $('product-count-info');
  const productsBody = $('products-body');
  const prevPageBtn = $('prev-page');
  const nextPageBtn = $('next-page');
  const pageInfo = $('page-info');
  const filterClave = $('filter-clave');
  const filterDescripcion = $('filter-descripcion');
  const quoteBody = $('quote-body');
  const quoteSubtotal = $('quote-subtotal');
  const quoteIva = $('quote-iva');
  const quoteTotal = $('quote-total');
  const priceLevel = $('price-level');
  const sendWhatsappBtn = $('send-whatsapp');
  const generatePdfBtn = $('generate-pdf');

  async function loadProducts() {
    loadingStatus.textContent = 'Cargando…';
    loadingStatus.className = 'status-loading';
    productCountInfo.textContent = '';
    filterClave.disabled = filterDescripcion.disabled = true;
    productsBody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-400">Cargando…</td></tr>';
    try {
      const res = await fetch(`${CSV_URL}?t=${Date.now()}`);
      const txt = await res.text();
      Papa.parse(txt, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim(),
        complete: ({ data }) => {
          data.forEach((row, i) => {
            const clave = (row.Clave || '').trim();
            const descripcion = (row.Descripcion || '').trim();
            const precioBase = parseFloat((row.PrecioPublico||'0').replace(/[^0-9.-]+/g,'').replace(/,/g,'.'))||0;
            const unidadMedida = (row.UnidadMedida||'PZA').trim();
            if (clave && descripcion) {
              const id = `prd-${i}`;
              productMap.set(id, { id, clave, descripcion, precioBase, unidadMedida });
            }
          });
          allProducts = Array.from(productMap.values());
          if (!allProducts.length) {
            loadingStatus.textContent = 'Error: sin productos válidos';
            loadingStatus.className = 'status-error';
            productsBody.innerHTML = '<tr><td colspan="5" class="p-6 text-red-600">Verifica data/productos.csv</td></tr>';
            return;
          }
          loadingStatus.textContent = 'Productos cargados:';
          loadingStatus.className = 'status-success';
          productCountInfo.textContent = `(${allProducts.length})`;
          filterClave.disabled = filterDescripcion.disabled = false;
          applyFilters();
        }
      });
    } catch (err) {
      console.error(err);
      loadingStatus.textContent = 'Error cargando CSV';
      loadingStatus.className = 'status-error';
    }
  }

  function applyFilters() {
    const c=filterClave.value.trim().toUpperCase();
    const d=filterDescripcion.value.trim().toUpperCase();
    filteredProducts = allProducts.filter(p =>
      (p.clave.toUpperCase().includes(c)||p.descripcion.toUpperCase().includes(c)) &&
      p.descripcion.toUpperCase().includes(d)
    );
    currentPage=1; renderCatalogPage();
  }

  function renderCatalogPage(){
    productsBody.innerHTML='';
    const totalPages=Math.max(1,Math.ceil(filteredProducts.length/ITEMS_PER_PAGE));
    const start=(currentPage-1)*ITEMS_PER_PAGE;
    const pageItems=filteredProducts.slice(start,start+ITEMS_PER_PAGE);
    if(!pageItems.length) productsBody.innerHTML='<tr><td colspan="5" class="p-6 text-gray-500 text-center">Sin resultados</td></tr>';
    else pageItems.forEach(p=>{
      const tr=document.createElement('tr');tr.classList.add('hover:bg-blue-50');
      tr.innerHTML=`
        <td class="px-4 py-2">${p.clave}</td>
        <td class="px-4 py-2">${p.descripcion}</td>
        <td class="px-4 py-2 text-right">${new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(p.precioBase)}</td>
        <td class="px-4 py-2 text-center"><input type="number" min="1" value="1" class="w-16 border rounded text-sm text-center qty" data-id="${p.id}"></td>
        <td class="px-4 py-2 text-center"><button class="bg-blue-600 text-white px-2 py-1 rounded add" data-id="${p.id}">+</button></td>
      `;
      productsBody.appendChild(tr);
    });
    pageInfo.textContent=`Página ${currentPage} / ${totalPages}`;
    prevPageBtn.disabled=currentPage===1;
    nextPageBtn.disabled=currentPage===totalPages;
  }

  prevPageBtn.addEventListener('click',()=>{if(currentPage>1){currentPage--;renderCatalogPage();}});
  nextPageBtn.addEventListener('click',()=>{const tp=Math.ceil(filteredProducts.length/ITEMS_PER_PAGE);if(currentPage<tp){currentPage++;renderCatalogPage();}});
  filterClave.addEventListener('input',()=>setTimeout(applyFilters,300));
  filterDescripcion.addEventListener('input',()=>setTimeout(applyFilters,300));

  productsBody.addEventListener('click',e=>{const btn=e.target.closest('.add');if(!btn)return;const id=btn.dataset.id;const inp=productsBody.querySelector(`input.qty[data-id="${id}"]`);const qty=parseInt(inp.value,10);if(qty>0)addToQuote(id,qty);});

  function addToQuote(id,qty){const prod=productMap.get(id);const exist=quote.find(x=>x.id===id);if(exist)exist.quantity+=qty;else quote.push({...prod,quantity:qty});updateQuote();}
  function removeFromQuote(id){quote=quote.filter(x=>x.id!==id);updateQuote();}
  function updateQuote(){quoteBody.innerHTML='';if(!quote.length){quoteBody.innerHTML='<tr><td colspan="9" class="p-4 text-gray-400 text-center">Añade productos…</td></tr>';sendWhatsappBtn.disabled=generatePdfBtn.disabled=true;return;}let subtotal=0;const disc=parseFloat(priceLevel.value)||0;quote.forEach((it,idx)=>{const unit=it.precioBase*(1-disc/100);const imp=unit*it.quantity;subtotal+=imp;const tr=document.createElement('tr');tr.innerHTML=`<td class="px-2 py-1 text-center">${idx+1}</td><td class="px-2 py-1">${it.clave}</td><td class="px-2 py-1">${it.descripcion}</td><td class="px-2 py-1 text-center">${it.quantity}</td><td class="px-2 py-1 text-center">${it.unidadMedida}</td><td class="px-2 py-1 text-right">${new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(unit)}</td><td class="px-2 py-1 text-center">${disc}%</td><td class="px-2 py-1 text-right">${new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(imp)}</td><td class="px-2 py-1 text-center"><button class="text-red-500">×</button></td>`;tr.querySelector('button').addEventListener('click',()=>removeFromQuote(it.id));quoteBody.appendChild(tr);});const iva=subtotal*IVA_RATE;quoteSubtotal.textContent=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(subtotal);quoteIva.textContent=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(iva);quoteTotal.textContent=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(subtotal+iva);sendWhatsappBtn.disabled=generatePdfBtn.disabled=false;}

  sendWhatsappBtn.addEventListener('click',()=>{const num=$('whatsapp-number').value.replace(/\D/g,'');if(!num){alert('Ingresa un número de WhatsApp válido');return;}let msg=encodeURIComponent('*Cotización TPS*\n');quote.forEach(it=>{msg+=`${it.clave} ${it.descripcion} x${it.quantity}\n`;});window.open(`https://wa.me/${num}?text=${msg}`,'_blank');});
  generatePdfBtn.addEventListener('click',()=>{const el=$('pdf-template');el.style.display='block';html2pdf().from(el).save().then(()=>{el.style.display='none'});});

  $('quote-date').value=new Date().toISOString().slice(0,10);
  loadProducts();
});
