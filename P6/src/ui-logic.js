const toggleCabina = document.getElementById('toggleCabina');
const cabina = document.getElementById('imagenCabina');

const toggleTutorial = document.getElementById('toggleTutorial');
const tutorialNave = document.getElementById('tutorialNave');
const tutorialFuera = document.getElementById('tutorialFuera');

toggleCabina.addEventListener('change', (e) => {
  const enLaNave = e.target.checked;
  cabina.style.display = enLaNave ? 'block' : 'none';
  
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