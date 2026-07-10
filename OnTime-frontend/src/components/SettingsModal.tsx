import { useEffect, useState } from 'react';
import { IoClose } from 'react-icons/io5';
import type { NotificationService } from '../types';

interface Props {
  discordWebhookUrl: string;
  googleChatWebhookUrl: string;
  defaultNotificationService: NotificationService;
  onDiscordWebhookChange: (url: string) => void;
  onGoogleChatWebhookChange: (url: string) => void;
  onDefaultServiceChange: (service: NotificationService) => void;
  onClose: () => void;
}

export function SettingsModal({
  discordWebhookUrl,
  googleChatWebhookUrl,
  defaultNotificationService,
  onDiscordWebhookChange,
  onGoogleChatWebhookChange,
  onDefaultServiceChange,
  onClose,
}: Props) {
  const [activeService, setActiveService] = useState<NotificationService>(
    defaultNotificationService
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleServiceChange = (service: NotificationService) => {
    setActiveService(service);
    onDefaultServiceChange(service);
  };

  const isDiscord = activeService === 'discord';

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="modal-heading">
          <h2 id="settings-title">Configurações</h2>

          <button type="button" onClick={onClose} aria-label="Fechar">
            <IoClose />
          </button>
        </div>

        <div className="modal-tabs" role="tablist" aria-label="Serviço de webhook">
          <button
            className={`modal-tab ${isDiscord ? 'modal-tab--active' : ''}`}
            type="button"
            onClick={() => handleServiceChange('discord')}
          >
            Discord
          </button>

          <button
            className={`modal-tab ${!isDiscord ? 'modal-tab--active' : ''}`}
            type="button"
            onClick={() => handleServiceChange('googleChat')}
          >
            Google Chat
          </button>
        </div>

        <label htmlFor="notification-webhook">
          {isDiscord ? 'Webhook do Discord' : 'Webhook do Google Chat'}
        </label>

        <input
          id="notification-webhook"
          type="url"
          value={isDiscord ? discordWebhookUrl : googleChatWebhookUrl}
          onChange={event => {
            if (isDiscord) {
              onDiscordWebhookChange(event.target.value);
            } else {
              onGoogleChatWebhookChange(event.target.value);
            }
          }}
          placeholder={
            isDiscord
              ? 'https://discord.com/api/webhooks/...'
              : 'https://chat.googleapis.com/v1/spaces/...'
          }
        />

        <p>
          Esse endereço é usado quando o Jonas salva novos lembretes de ponto.
        </p>
      </section>
    </div>
  );
}