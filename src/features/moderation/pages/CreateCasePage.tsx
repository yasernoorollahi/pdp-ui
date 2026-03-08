import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../../components/layout/Header/Header';
import { PageWrapper } from '../../../components/layout/PageWrapper/PageWrapper';
import { Card } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Select } from '../../../components/ui/Select/Select';
import { Badge } from '../../../components/ui/Badge/Badge';
import { moderationService } from '../services/moderationService';
import type { TargetType, ReasonCategory, ModerationCase } from '../types/moderation.types';
import styles from './CreateCasePage.module.css';

type FormState = {
  targetType: TargetType;
  targetId: string;
  reasonCategory: ReasonCategory;
  comment: string;
};

const TARGET_OPTIONS: TargetType[] = ['USER', 'CONTENT'];
const REASON_OPTIONS: ReasonCategory[] = [
  'SPAM',
  'HATE_SPEECH',
  'HARASSMENT',
  'FRAUD',
  'VIOLENCE',
  'SELF_HARM',
  'OTHER',
];

const TARGET_LABELS: Record<TargetType, string> = {
  USER: 'User',
  CONTENT: 'Content',
};

const REASON_LABELS: Record<ReasonCategory, string> = {
  SPAM: 'Spam',
  HATE_SPEECH: 'Hate Speech',
  HARASSMENT: 'Harassment',
  FRAUD: 'Fraud',
  VIOLENCE: 'Violence',
  SELF_HARM: 'Self Harm',
  OTHER: 'Other',
};

const initialForm: FormState = {
  targetType: 'CONTENT',
  targetId: '',
  reasonCategory: 'SPAM',
  comment: '',
};

export const CreateCasePage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ModerationCase | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.targetId.trim()) {
      setError('Target ID is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await moderationService.createCase({
        targetType: form.targetType,
        targetId: form.targetId.trim(),
        reasonCategory: form.reasonCategory,
        comment: form.comment.trim(),
      });
      setCreated(res);
      setForm(initialForm);
    } catch (error) {
      const message = error instanceof Error && error.message === 'UNAUTHORIZED'
        ? 'Session expired. Please login again.'
        : 'Failed to create moderation case.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header
        title="Create Moderation Case"
        breadcrumb="Console · Moderation · New Case"
        right={
          <Button variant="ghost" onClick={() => navigate('/admin/moderation/queue')}>
            Go to Queue
          </Button>
        }
      />

      <PageWrapper>
        <div className={styles.grid}>
          <Card topLine>
            <form className={styles.form} onSubmit={onSubmit}>
              <div className={styles.row2}>
                <Select
                  options={TARGET_OPTIONS.map((t) => ({ value: t, label: TARGET_LABELS[t] }))}
                  label="Target Type"
                  value={form.targetType}
                  onChange={(e) => setForm((p) => ({ ...p, targetType: e.target.value as TargetType }))}
                />

                <Select
                  options={REASON_OPTIONS.map((r) => ({ value: r, label: REASON_LABELS[r] }))}
                  label="Reason Category"
                  value={form.reasonCategory}
                  onChange={(e) => setForm((p) => ({ ...p, reasonCategory: e.target.value as ReasonCategory }))}
                />
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Target ID</span>
                <Input
                  placeholder="UUID of user/content"
                  value={form.targetId}
                  onChange={(e) => setForm((p) => ({ ...p, targetId: e.target.value }))}
                />
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Comment</span>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  value={form.comment}
                  onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
                  placeholder="Reason details..."
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.actions}>
                <Button type="submit" variant="teal" loading={submitting}>
                  Create Case
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForm(initialForm)}
                  disabled={submitting}
                >
                  Reset
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <p className={styles.sideTitle}>Latest Created Case</p>
            {!created && <p className={styles.muted}>No case created in this session.</p>}
            {created && (
              <div className={styles.summary}>
                <div className={styles.summaryRow}><span>ID</span><code>{created.id}</code></div>
                <div className={styles.summaryRow}><span>Status</span><Badge variant="gold">{created.status}</Badge></div>
                <div className={styles.summaryRow}><span>Target</span><span>{TARGET_LABELS[created.targetType]} · {created.targetId}</span></div>
                <div className={styles.summaryRow}><span>Reason</span><span>{REASON_LABELS[created.reasonCategory]}</span></div>
                <div className={styles.summaryRow}><span>Risk Score</span><span>{created.riskScore}</span></div>
                <div className={styles.summaryActions}>
                  <Button variant="ghost" onClick={() => navigate('/admin/moderation/queue')}>Open Queue</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </PageWrapper>
    </>
  );
};
