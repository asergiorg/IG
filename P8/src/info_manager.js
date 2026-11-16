const btnInfo = document.getElementById('btn-info');
const modalInfo = document.getElementById('modal-info');
const btnCerrar = document.getElementById('cerrar-modal');

// Muestra u oculta el cuadro al pulsar el botón de información
btnInfo.addEventListener('click', () => {
  modalInfo.classList.toggle('activo');
});

btnCerrar.addEventListener('click', () => {
  modalInfo.classList.remove('activo');
});

// Cerrar al hacer clic fuera de la ventana
modalInfo.addEventListener('click', (e) => {
  if (e.target === modalInfo) {
    modalInfo.classList.remove('activo');
  }
});

// Cerrar al pulsar la tecla Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalInfo.classList.contains('activo')) {
    modalInfo.classList.remove('activo');
  }
});