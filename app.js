function cotizador() {
  return {
    products: [],
    filtered: [],
    quote: [],
    filter: { clave: '', desc: '' },
    page: 1,
    perPage: 9,

    get totalPages() {
      return Math.ceil(this.filtered.length / this.perPage);
    },

    get paginatedProducts() {
      const start = (this.page - 1) * this.perPage;
      return this.filtered.slice(start, start + this.perPage);
    },

    get subtotal() {
      return this.quote.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    },

    get iva() {
      return this.subtotal * 0.16;
    },

    get total() {
      return this.subtotal + this.iva;
    },

    formatCurrency(value) {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
    },

    loadProducts() {
      fetch('data/productos.csv')
        .then(r => r.text())
        .then(txt => {
          Papa.parse(txt, {
            header: true,
            skipEmptyLines: true,
            complete: (res) => {
              this.products = res.data.map((p, i) => ({
                id: `p-${i}`,
                clave: p.Clave,
                descripcion: p.Descripcion,
                precioBase: parseFloat(p.PrecioPublico.replace(/[^0-9.-]+/g, '').replace(',', '.')),
                qty: 1
              }));
              this.applyFilters();
            }
          });
        });
    },

    applyFilters() {
      const c = this.filter.clave.toUpperCase();
      const d = this.filter.desc.toUpperCase();
      this.filtered = this.products.filter(p =>
        (p.clave.toUpperCase().includes(c) || p.descripcion.toUpperCase().includes(c)) &&
        p.descripcion.toUpperCase().includes(d)
      );
      this.page = 1;
    },

    prevPage() {
      if (this.page > 1) this.page--;
    },
    nextPage() {
      if (this.page < this.totalPages) this.page++;
    },

    addToQuote(prod) {
      const existing = this.quote.find(q => q.id === prod.id);
      if (existing) existing.quantity += prod.qty;
      else this.quote.push({ ...prod, unitPrice: prod.precioBase });
    },
    removeFromQuote(id) {
      this.quote = this.quote.filter(q => q.id !== id);
    },

    exportWhatsapp() {
      let msg = `*Cotización TPS*\n`;
      this.quote.forEach(i => {
        msg += `${i.clave} x${i.quantity} = ${this.formatCurrency(i.quantity * i.unitPrice)}\n`;
      });
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    },

    exportPDF() {
      // Rellenar plantilla...
      html2pdf().from(document.body).save();
    },

    init() {
      this.loadProducts();
    }
  };
}
