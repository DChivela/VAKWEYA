import { ImagePlus, Loader2, X } from 'lucide-react';
import { useId, useState } from 'react';
import { uploadImage } from '../services/api';

export function FileUploadField({
  label = 'Imagem',
  value,
  onChange,
  token,
  folder = 'content',
  compact = false
}) {
  const inputId = useId();
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setStatus({ type: 'error', message: 'Escolhe uma imagem válida.' });
      return;
    }

    setStatus({ type: 'loading', message: 'A carregar imagem...' });

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const payload = await uploadImage(
          {
            dataUrl: reader.result,
            filename: file.name,
            folder
          },
          token
        );
        onChange(payload.url);
        setStatus({ type: 'success', message: 'Imagem carregada.' });
      } catch (error) {
        setStatus({ type: 'error', message: error.message });
      } finally {
        event.target.value = '';
      }
    };
    reader.onerror = () => {
      setStatus({ type: 'error', message: 'Não foi possível ler a imagem.' });
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className={compact ? 'file-upload file-upload--compact' : 'file-upload'}>
      <span>{label}</span>
      {value ? (
        <div className="file-upload__preview">
          <img src={value} alt="" />
          <button type="button" onClick={() => onChange('')} aria-label="Remover imagem">
            <X size={15} />
          </button>
        </div>
      ) : (
        <div className="file-upload__empty">
          <ImagePlus size={22} />
        </div>
      )}

      <label className="file-upload__button" htmlFor={inputId}>
        {status.type === 'loading' ? <Loader2 size={16} /> : <ImagePlus size={16} />}
        Escolher imagem
      </label>
      <input id={inputId} type="file" accept="image/*" onChange={handleFileChange} />
      {status.message && (
        <small className={`file-upload__status file-upload__status--${status.type}`}>
          {status.message}
        </small>
      )}
    </div>
  );
}
