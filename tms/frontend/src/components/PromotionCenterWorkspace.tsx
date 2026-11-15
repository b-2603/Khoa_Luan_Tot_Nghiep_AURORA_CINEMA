import { useState } from 'react';
import { PromotionApprovalWorkspace } from './PromotionWorkspace';
import './PromotionApprovalWorkspace.css';

type Props = {
  apiBase: string;
  notify: (message: string) => void;
  requestConfirm: (message: string, action: () => void | Promise<void>, title?: string, confirmLabel?: string) => void;
};

export default function PromotionCenterWorkspace(props: Props) {
  const [section, setSection] = useState<'approval' | 'management'>('approval');
  const management = section === 'management';

  return (
    <div className="promotion-center">
      <nav className="promotion-center-tabs" role="tablist" aria-label="Chức năng CTKM">
        <button
          type="button"
          role="tab"
          aria-selected={!management}
          className={!management ? 'active' : ''}
          onClick={() => setSection('approval')}
        >
          Duyệt kế hoạch
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={management}
          className={management ? 'active' : ''}
          onClick={() => setSection('management')}
        >
          Quản lý CTKM hệ thống
        </button>
      </nav>
      <section role="tabpanel">
        <PromotionApprovalWorkspace
          key={section}
          {...props}
          initialStatus={management ? 'all' : 'pending_approval'}
        />
      </section>
    </div>
  );
}
