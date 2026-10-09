import { getLocale, getT } from '@/lib/i18n';
import { AdminLive } from '@/components/admin-live-client';

export default function LivePage() {
  const t = getT(getLocale());
  return (
    <>
      <div className="page-head"><h1>{t('nav_live')}</h1></div>
      <AdminLive
        labels={{
          bus: t('bus'),
          morning: t('c_tripMorning'),
          afternoon: t('c_tripAfternoon'),
          notRunning: t('a_notRunning'),
          stopsDone: t('a_stopsDone'),
          next: t('c_nextStop'),
          min: t('c_min'),
          lastPing: t('a_lastPing'),
          noLocation: t('a_noLocation'),
        }}
      />
    </>
  );
}
