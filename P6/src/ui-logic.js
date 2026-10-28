const toggleCabina = document.getElementById('toggleCabina');
const cabina = document.getElementById('imagenCabina');
const textoPantalla = document.getElementById('textoPantallaCabina'); // Nuevo elemento

const toggleTutorial = document.getElementById('toggleTutorial');
const tutorialNave = document.getElementById('tutorialNave');
const tutorialFuera = document.getElementById('tutorialFuera');

// Recibe el texto y lo inyecta en el recuadro
export function write(texto) {
  textoPantalla.innerHTML = texto;
}

// Alterna entre la nave y el exterior
toggleCabina.addEventListener('change', (e) => {
  const enLaNave = e.target.checked;
  cabina.style.display = enLaNave ? 'block' : 'none';
  
  // Oculta también el texto holográfico si sales de la cabina
  textoPantalla.style.display = enLaNave ? 'block' : 'none';
  
  if (toggleTutorial.checked) {
    tutorialNave.style.display = enLaNave ? 'block' : 'none';
    tutorialFuera.style.display = enLaNave ? 'none' : 'block';
  }
});

toggleTutorial.addEventListener('change', (e) => {
  const mostrar = e.target.checked;
  const enLaNave = toggleCabina.checked;
  
  if (mostrar) {
    tutorialNave.style.display = enLaNave ? 'block' : 'none';
    tutorialFuera.style.display = enLaNave ? 'none' : 'block';
  } else {
    tutorialNave.style.display = 'none';
    tutorialFuera.style.display = 'none';
  }
});

write("SISTEMA EN LÍNEA<br>Motores: OK<br>Escudos: 100%");