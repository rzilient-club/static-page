/**
 * Lightbox para ampliar capturas de pantalla
 */
document.addEventListener('DOMContentLoaded', function() {
  
  // Crear lightbox
  const lightbox = document.createElement('div');
  lightbox.className = 'screenshot-lightbox';
  lightbox.innerHTML = `
    <span class="screenshot-lightbox-close">&times;</span>
    <img src="" alt="Screenshot ampliado">
  `;
  document.body.appendChild(lightbox);
  
  const lightboxImg = lightbox.querySelector('img');
  const closeBtn = lightbox.querySelector('.screenshot-lightbox-close');
  
  // Click en screenshots para ampliar
  document.querySelectorAll('.platform-screenshot img.screenshot').forEach(img => {
    img.addEventListener('click', function() {
      lightboxImg.src = this.src;
      lightboxImg.alt = this.alt;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });
  
  // Cerrar lightbox
  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  closeBtn.addEventListener('click', closeLightbox);
  
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });
  
  // ESC para cerrar
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });
  
  console.log('✅ Screenshot lightbox inicializado');
});
