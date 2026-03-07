import { Skeleton } from '../../components/ui/Skeleton';

export const TutelleDashboard = () => {
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold mb-4">Tableau de bord Tutelle</h2>
                <p className="text-slate-600 mb-6">Suivi des examens à l'échelle de la tutelle.</p>

                {/* Placeholder content */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <Skeleton variant="card" size="sm" />
                    <Skeleton variant="card" size="sm" />
                    <Skeleton variant="card" size="sm" />
                </div>

                <div className="mt-8 space-y-3">
                    <Skeleton variant="line" size="md" />
                    <Skeleton variant="line" size="md" />
                    <Skeleton variant="line" size="sm" className="w-5/6" />
                </div>
            </div>
        </div>
    );
};
