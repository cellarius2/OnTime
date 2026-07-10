import { useEffect, useState } from 'react';
import { IoClose } from 'react-icons/io5';

const GOOGLE_CHAT_TUTORIAL_VIDEO_URL = 'https://www.youtube.com/embed/y5y5OuWn7vU';
const DISCORD_TUTORIAL_VIDEO_URL = 'https://www.youtube.com/embed/9q_kaNG4Sao';

type HelpTab = 'googleChat' | 'discord';

interface Props {
  onClose: () => void;
}

export function HelpTutorialModal({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<HelpTab>('googleChat');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const videoUrl = activeTab === 'googleChat'
    ? GOOGLE_CHAT_TUTORIAL_VIDEO_URL
    : DISCORD_TUTORIAL_VIDEO_URL;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="settings-modal help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="modal-heading">
          <h2 id="help-title">Como configurar notificações</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <IoClose />
          </button>
        </div>

        <p className="modal-description">
          Para que a notificação seja enviada, você deve recolher o valor do webhook no sistema desejado.
        </p>

        <div className="modal-tabs" role="tablist" aria-label="Tutoriais de webhook">
          <button
            className={`modal-tab ${activeTab === 'googleChat' ? 'modal-tab--active' : ''}`}
            type="button"
            onClick={() => setActiveTab('googleChat')}
          >
            Google Chat
          </button>
          <button
            className={`modal-tab ${activeTab === 'discord' ? 'modal-tab--active' : ''}`}
            type="button"
            onClick={() => setActiveTab('discord')}
          >
            Discord
          </button>
        </div>

        {activeTab === 'googleChat' ? (
          <div className="tutorial-content">
            <strong>Requisitos: Uma conta corporativa ou de estudante.</strong>
            <ol>
              <li>Abra o espaço do Google Chat onde deseja receber os lembretes.</li>
              <li>Acesse Apps e integrações, depois escolha Webhooks.</li>
              <li>Crie um novo webhook, dê um nome e copie a URL gerada.</li>
              <li>Cole a URL em Configurações na aba Google Chat.</li>
            </ol>
          </div>
        ) : (
          <div className="tutorial-content">
            <ol>
              <li>Abra o servidor e o canal do Discord que receberá os lembretes.</li>
              <li>Acesse Editar canal, Integrações e depois Webhooks.</li>
              <li>Crie um webhook, escolha o canal correto e copie a URL.</li>
              <li>Cole a URL em Configurações na aba Discord.</li>
            </ol>
          </div>
        )}

        <div className="tutorial-video">
          <iframe
            title={`Tutorial ${activeTab === 'googleChat' ? 'Google Chat' : 'Discord'}`}
            src={videoUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>
    </div>
  );
}
