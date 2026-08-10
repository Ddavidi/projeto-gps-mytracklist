import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configuração lida automaticamente pelas variáveis CLOUDINARY_URL ou individuais do .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Faz upload de um buffer (memória) direto para o Cloudinary.
 * Útil quando usamos multer em MemoryStorage para não salvar em disco local.
 * 
 * @param buffer O buffer do arquivo enviado
 * @param folder Pasta destino no Cloudinary (ex: 'avatars', 'covers')
 * @returns Promise com o resultado do upload
 */
export const uploadBufferToCloudinary = (buffer: Buffer, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
};

export default cloudinary;
