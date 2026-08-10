import React, { useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Slider, Typography, Box } from '@mui/material';
import Cropper from 'react-easy-crop';

// Função utilitária para criar a imagem cortada
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      blob.name = 'cropped.jpeg';
      resolve(blob);
    }, 'image/jpeg');
  });
}

export default function ImageCropperModal({ open, imageFile, aspect, onClose, onCropDone }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // We need to convert the File to an Object URL to display it
  const imageSrc = React.useMemo(() => {
    if (imageFile) {
      return URL.createObjectURL(imageFile);
    }
    return null;
  }, [imageFile]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      // Criar um novo arquivo a partir do Blob
      const file = new File([croppedBlob], imageFile.name, { type: 'image/jpeg' });
      onCropDone(file);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ajustar Imagem</DialogTitle>
      <DialogContent sx={{ position: 'relative', height: 400, bgcolor: '#333' }}>
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', px: 3, pb: 3 }}>
        <Box sx={{ width: '100%', mb: 2 }}>
          <Typography gutterBottom color="text.secondary">Zoom</Typography>
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e, zoom) => setZoom(zoom)}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: 1 }}>
          <Button onClick={onClose} variant="outlined">Cancelar</Button>
          <Button onClick={handleSave} variant="contained" color="primary">Cortar e Salvar</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
