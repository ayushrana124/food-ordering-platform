import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <h1
                    className="font-outfit font-black text-[6rem] leading-none mb-2"
                    style={{ background: 'linear-gradient(135deg, #E8A317, #CB8D10)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                    404
                </h1>
                <h2 className="font-outfit font-bold text-[1.4rem] text-[#0F0F0F] mb-3">
                    Page not found
                </h2>
                <p className="text-[#8E8E8E] text-[0.95rem] mb-8">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <div className="flex gap-3 justify-center">
                    <Link
                        to="/"
                        className="btn-primary flex items-center gap-2 no-underline"
                    >
                        <Home size={16} /> Go Home
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="btn-outline flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}
