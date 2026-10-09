import { redirect } from 'next/navigation';
import { GRADES, getLocale, getT, gradeLabel, schoolName } from '@/lib/i18n';
import { isLocked, requireFamily } from '@/lib/parent';
import { createAdminClient } from '@/lib/supabase/admin';
import { Notice } from '@/components/ui';
import { StepHead } from '@/components/parent';
import { ChildrenFields, SubmitButton } from '@/components/parent-client';
import { saveChildren } from '../../actions';

export default async function Children({ searchParams }: { searchParams: { error?: string } }) {
  const fam = await requireFamily();
  if (isLocked(fam)) redirect('/parent');
  const locale = getLocale();
  const t = getT(locale);
  const { data: schools } = await createAdminClient().from('schools').select('id, name_ar, name_en').order('name_en');
  return (
    <form className="stack" action={saveChildren}>
      <StepHead step={3} t={t} backHref="/register/location" />
      <h1>{t('p_kidsTitle')}</h1>
      <p className="lead">{t('p_kidsLead')}</p>
      <Notice error={searchParams.error === 'kids' ? t('p_kidsRequired') : searchParams.error ? t('errorGeneric') : undefined} />
      <ChildrenFields
        initial={fam.children.map((c) => ({ name: c.full_name, school: c.school_id ?? '', grade: c.grade ?? '', notes: c.notes ?? '' }))}
        schools={(schools ?? []).map((s) => ({ id: s.id, name: schoolName(s, locale) }))}
        grades={GRADES.map((g) => ({ value: g, label: gradeLabel(g, locale) }))}
        labels={{ child: t('p_child'), name: t('p_firstName'), school: t('school'), grade: t('grade'), notesPh: t('p_notesPh'), addAnother: t('p_addAnother'), remove: t('p_remove') }}
      />
      <SubmitButton className="btn btn-primary btn-block">{t('p_seePackages')}</SubmitButton>
    </form>
  );
}
