import { useEffect, useState } from 'react';
import { FaCog, FaHome, FaQuestionCircle, FaRegBell, FaRegClock } from 'react-icons/fa';
import { GiLeafSwirl, GiLightningBranches, GiOakLeaf, GiSparkles } from 'react-icons/gi';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import { HelpTutorialModal } from './components/HelpTutorialModal';
import { JonasChatWidget } from './components/JonasChatWidget';
import { ReminderFormModal } from './components/ReminderFormModal';
import { SchedulePanel } from './components/SchedulePanel';
import { SettingsModal } from './components/SettingsModal';
import { useSchedules } from './hooks/useSchedules';
import type { NotificationService, Schedule } from './types';
import jonasHero from './assets/jonas-hero.png';
import jonasMark from './assets/jonas-mark.png';
import './App.css';

export default function App() {
  const {
    schedules,
    loading,
    apiError,
    addSchedules,
    saveManualSchedule,
    toggleSchedule,
    deleteSchedule,
  } = useSchedules();

  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(
    localStorage.getItem('ontime_discord_webhook') ?? ''
  );

  const [googleChatWebhookUrl, setGoogleChatWebhookUrl] = useState(
    localStorage.getItem('ontime_googlechat_webhook') ?? ''
  );

  const [defaultNotificationService, setDefaultNotificationService] =
    useState<NotificationService>(
      (localStorage.getItem('ontime_default_notification_service') as NotificationService | null) ?? 'discord'
    );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    window.history.replaceState(null, '', window.location.pathname);

    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto',
      });
    };

    scrollToTop();

    const timer = setTimeout(scrollToTop, 100);

    return () => clearTimeout(timer);
  }, []);

  const activeSchedules = schedules.filter(schedule => schedule.active).length;

  const defaultWebhookUrl =
    defaultNotificationService === 'discord'
      ? discordWebhookUrl
      : googleChatWebhookUrl;

  const handleDiscordWebhookChange = (url: string) => {
    setDiscordWebhookUrl(url);
    localStorage.setItem('ontime_discord_webhook', url);
  };

  const handleGoogleChatWebhookChange = (url: string) => {
    setGoogleChatWebhookUrl(url);
    localStorage.setItem('ontime_googlechat_webhook', url);
  };

  const handleDefaultServiceChange = (service: NotificationService) => {
    setDefaultNotificationService(service);
    localStorage.setItem('ontime_default_notification_service', service);
  };

  const openCreateReminder = () => {
    setEditingSchedule(null);
    setReminderModalOpen(true);
  };

  const openEditReminder = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setReminderModalOpen(true);
  };

  const scrollToJonasChat = () => {
    document.getElementById('jonas-chat')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="app-shell">
      <header className="site-navbar">
        <a className="brand" href="#home" aria-label="OnTime">
          <img src={jonasMark} alt="" />
          <span>OnTime</span>
        </a>

        <nav className="nav-links" aria-label="Navegação principal">
          <a className="nav-link nav-link--active" href="#home">
            <FaHome aria-hidden="true" />
            Início
          </a>

          <button className="nav-link nav-link-button" type="button" onClick={() => setHelpOpen(true)}>
            <FaQuestionCircle aria-hidden="true" />
            Ajuda
          </button>

          <button
            className="nav-link nav-link-button"
            type="button"
            onClick={() => setSettingsOpen(true)}
          >
            <FaCog aria-hidden="true" />
            Configurações
          </button>
        </nav>
      </header>

      <main id="home" className="page-flow">
        <section className="hero-page">
          <section className="hero-panel" aria-label="Apresentação do OnTime">
            <div className="hero-copy">
              <span className="status-pill">
                <span aria-hidden="true" />
                TIC TAC
              </span>

              <h1>
                Nunca mais esqueça
                <br />
                de <strong>bater o ponto!</strong>
                <span className="clock-bubble">
                  <FaRegClock />
                </span>
              </h1>

              <p>
                O Jonas está aqui para te ajudar a lembrar dos seus horários e manter você
                sempre em dia.
              </p>

              <button className="hero-action" type="button" onClick={scrollToJonasChat}>
                <HiChatBubbleLeftRight aria-hidden="true" />
                Fale com Jonas
              </button>
            </div>

            <div className="hero-art" aria-hidden="true">
              <span className="nature-leaf leaf-one"><GiOakLeaf /></span>
              <span className="nature-leaf leaf-two"><GiLeafSwirl /></span>
              <span className="nature-leaf leaf-three"><GiOakLeaf /></span>
              <span className="nature-leaf leaf-four"><GiLeafSwirl /></span>
              <span className="nature-leaf leaf-five"><GiOakLeaf /></span>
              <span className="nature-leaf leaf-six"><GiLeafSwirl /></span>
              <span className="nature-leaf leaf-seven"><GiOakLeaf /></span>
              <span className="nature-leaf leaf-eight"><GiLeafSwirl /></span>
              <span className="nature-leaf leaf-nine"><GiOakLeaf /></span>
              <span className="nature-leaf leaf-ten"><GiLeafSwirl /></span>
              <span className="nature-leaf leaf-eleven"><GiOakLeaf /></span>
              <span className="nature-leaf leaf-twelve"><GiLeafSwirl /></span>
              <span className="nature-leaf leaf-thirteen"><GiOakLeaf /></span>
              <span className="nature-leaf leaf-fourteen"><GiLeafSwirl /></span>

              <span className="nature-ray ray-one"><GiLightningBranches /></span>
              <span className="nature-ray ray-two"><GiLightningBranches /></span>
              <span className="nature-ray ray-three"><GiLightningBranches /></span>
              <span className="nature-ray ray-four"><GiLightningBranches /></span>

              <span className="nature-spark spark-one"><GiSparkles /></span>
              <span className="nature-spark spark-two"><GiSparkles /></span>
              <span className="nature-spark spark-three"><GiSparkles /></span>
              <span className="nature-spark spark-four"><GiSparkles /></span>
              <span className="nature-spark spark-five"><GiSparkles /></span>
              <span className="nature-spark spark-six"><GiSparkles /></span>

              <span className="firefly firefly-one" />
              <span className="firefly firefly-two" />
              <span className="firefly firefly-three" />
              <span className="firefly firefly-four" />
              <span className="firefly firefly-five" />
              <span className="firefly firefly-six" />
              <span className="firefly firefly-seven" />
              <span className="firefly firefly-eight" />
              <span className="firefly firefly-nine" />

              <span className="star star-one">✦</span>
              <span className="star star-two">✦</span>

              <img src={jonasHero} alt="" />
            </div>
          </section>
        </section>

        <section className="dashboard-page">
          <div className="dashboard-container">
            <div className="dashboard-actions">
              <button
                className="settings-button dashboard-settings-button"
                type="button"
                onClick={() => setSettingsOpen(true)}
              >
                <FaCog aria-hidden="true" />
                Configurações
              </button>
            </div>

            <div className="dashboard-grid">
              <section id="jonas-chat" className="panel chat-panel">
                <span className="panel-leaf chat-leaf-one"><GiOakLeaf /></span>
                <span className="panel-leaf chat-leaf-two"><GiLeafSwirl /></span>
                <span className="panel-leaf chat-leaf-three"><GiOakLeaf /></span>
                <span className="panel-spark chat-spark-one"><GiSparkles /></span>
                <span className="panel-firefly chat-firefly-one" />
                <span className="panel-firefly chat-firefly-two" />

                <div className="panel-title">
                  <span className="title-icon"><HiChatBubbleLeftRight /></span>
                  <h2>Fale com o Jonas</h2>
                </div>

                <JonasChatWidget
                  webhookUrl={defaultWebhookUrl}
                  notificationService={defaultNotificationService}
                  onSchedulesSaved={addSchedules}
                />
              </section>

              <section className="panel reminders-panel">
                <span className="panel-leaf reminder-leaf-one"><GiOakLeaf /></span>
                <span className="panel-leaf reminder-leaf-two"><GiLeafSwirl /></span>
                <span className="panel-leaf reminder-leaf-three"><GiOakLeaf /></span>
                <span className="panel-leaf reminder-leaf-four"><GiLeafSwirl /></span>
                <span className="panel-spark reminder-spark-one"><GiSparkles /></span>
                <span className="panel-firefly reminder-firefly-one" />
                <span className="panel-firefly reminder-firefly-two" />

                <div className="panel-title">
                  <span className="title-icon"><FaRegBell /></span>
                  <h2>Seus lembretes</h2>
                  <span className="badge">{activeSchedules} ativos</span>
                </div>

                {apiError && <p className="loading" role="alert">{apiError}</p>}

                {loading ? (
                  <p className="loading">Carregando...</p>
                ) : (
                  <SchedulePanel
                    schedules={schedules}
                    onCreate={openCreateReminder}
                    onEdit={openEditReminder}
                    onToggle={toggleSchedule}
                    onDelete={deleteSchedule}
                  />
                )}
              </section>
            </div>

            <footer className="app-footer">
              <div className="footer-credentials">
                <a href="mailto:EmilyCellarius2@gmail.com">
                  <span aria-hidden="true">&#9993;</span>
                  EmilyCellarius2@gmail.com
                </a>
                <p>&copy; 2026 OnTime. Todos os direitos reservados.</p>
              </div>

              <div className="footer-brand">
                <img src={jonasMark} alt="" />
                <span>OnTime</span>
                <span>&bull;</span>
                <span>Seu ouriço de confiança</span>
                <span className="heart">&#9829;</span>
              </div>
            </footer>
          </div>
        </section>
      </main>

      {helpOpen && <HelpTutorialModal onClose={() => setHelpOpen(false)} />}

      {settingsOpen && (
        <SettingsModal
          discordWebhookUrl={discordWebhookUrl}
          googleChatWebhookUrl={googleChatWebhookUrl}
          defaultNotificationService={defaultNotificationService}
          onDiscordWebhookChange={handleDiscordWebhookChange}
          onGoogleChatWebhookChange={handleGoogleChatWebhookChange}
          onDefaultServiceChange={handleDefaultServiceChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {reminderModalOpen && (
        <ReminderFormModal
          schedule={editingSchedule}
          discordWebhookUrl={discordWebhookUrl}
          googleChatWebhookUrl={googleChatWebhookUrl}
          defaultNotificationService={defaultNotificationService}
          onSave={schedule => {
            saveManualSchedule(schedule);
            setReminderModalOpen(false);
            setEditingSchedule(null);
          }}
          onClose={() => {
            setReminderModalOpen(false);
            setEditingSchedule(null);
          }}
        />
      )}
    </div>
  );
}
