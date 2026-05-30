import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ActionButton from '../components/common/ActionButton';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <h1 className="text-9xl font-extrabold text-blue-600 tracking-widest">404</h1>
        <div className="bg-amber-400 text-slate-900 px-2 text-sm rounded rotate-12 absolute mb-16">
          Page Not Found
        </div>
        <p className="text-slate-600 text-lg mt-6 mb-8 max-w-md">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <ActionButton onClick={() => navigate('/')} variant="primary">
          Go back to Home
        </ActionButton>
      </div>
    </MainLayout>
  );
}
