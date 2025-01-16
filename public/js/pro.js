let croppers={}
function cropper(index){
    const files = document.getElementById(`image${index}`)
    const previiew=document.getElementById(`prev${index}`)
    const file = files.files[0]
      if (file) {
        const objectURL = URL.createObjectURL(file)
        previiew.src = objectURL
        previiew.style.display = 'block'
        if (croppers[index]) {
          croppers[index].destroy(); 
        }
        croppers[index] = new Cropper(previiew, {
          aspectRatio: 1,
          cropBoxResizable: false,
          cropBoxMovable: true, 
          dragMode: 'none',
          ready: function () {
            
            this.cropper.setCropBoxData({
              width: 100, 
              height: 100, 
            });
          },
        });
      }
  }

  document.getElementById('addform').addEventListener('submit', (event) => {
  
    let images = []; // Initialize the array
    for (let i = 1; i <= 4; i++) { // Start from 1 to 4
      const canvas = croppers[i]?.getCroppedCanvas();
      const base64Image = canvas ? canvas.toDataURL('image/png') : ''; // Ensure image is valid
      images.push(base64Image);
    }
  
    // Log images to ensure they are set correctly
    console.log(images);
  
    // Set the hidden input fields' values
    document.getElementById('photo1').value = images[0];  // Corrected index
    document.getElementById('photo2').value = images[1];
    document.getElementById('photo3').value = images[2];
    document.getElementById('photo4').value = images[3];
  
    // Now submit the form
    event.preventDefault();  // Prevent the form from submitting right away
    event.target.submit();   // Submit the form after setting the values
  });
  
  
  