import { redirect } from 'next/navigation';
import { getLocale, getT } from '@/lib/i18n';
import { isLocked, requireFamily } from '@/lib/parent';
import { Notice } from '@/components/ui';
import { StepHead } from '@/components/parent';
import { LocationPicker, SubmitButton } from '@/components/parent-client';
import { saveLocation } from '../../actions';

export default async function Location({ searchParams }: { searchParams: { error?: string } }) {
  const fam = await requireFamily();
  if (isLocked(fam)) redirect('/parent');
  const t = getT(getLocale());
  const p = fam.parent;
  return (
    <form className="stack" action={saveLocation}>
      <StepHead step={3} t={t} />
      <h1>{t('p_locTitle')}</h1>
      <p className="lead">{t('p_locLead')}</p>
      <Notice error={searchParams.error ? t('p_locRequired') : undefined} />
      <LocationPicker
        initial={p.home_lat != null && p.home_lng != null ? { lat: p.home_lat, lng: p.home_lng } : null}
        labels={{ gps: t('p_useGps'), denied: t('p_gpsDenied') }}
      />
      <div className="field">
        <label htmlFor="address">{t('p_address')}</label>
        <input className="input" id="address" name="address" defaultValue={p.address ?? ''} placeholder={t('p_addressPh')} />
      </div>
      <div className="field">
        <label htmlFor="landmark">{t('p_landmark')}</label>
        <input className="input" id="landmark" name="landmark" defaultValue={p.landmark ?? ''} placeholder={t('p_landmarkPh')} />
      </div>
      <SubmitButton className="btn btn-primary btn-block">{t('p_confirmLoc')}</SubmitButton>
    </form>
  );
}
