import { Component, ErrorInfo, ReactNode } from 'react';
import { MessageSquareWarning, RefreshCw } from 'lucide-react';

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class CommunicationErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Communication workspace render error', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="communication-recovery" role="alert">
      <span><MessageSquareWarning /></span>
      <h2>Không thể hiển thị kênh trao đổi</h2>
      <p>Giao diện gặp lỗi khi dựng một hội thoại. Các phần khác của TMS vẫn hoạt động bình thường.</p>
      <button type="button" onClick={() => { this.setState({ failed: false }); window.location.reload(); }}><RefreshCw />Tải lại kênh trao đổi</button>
    </section>;
  }
}
