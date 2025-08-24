import { Suspense } from 'react';
import InquirySentClientPage from './InquirySentClientPage';

export default function InquirySentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InquirySentClientPage />
    </Suspense>
  );
}