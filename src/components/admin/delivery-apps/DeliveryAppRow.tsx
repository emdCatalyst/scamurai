'use client';

import { useTranslations, useFormatter } from 'next-intl';
import { CatalogAppRow } from '@/lib/queries/deliveryAppCatalog';
import { cn } from '@/lib/utils';
import { ShieldOff, ShieldCheck, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { setCatalogAppStatus } from '@/actions/setCatalogAppStatus';
import { deleteCatalogApp } from '@/actions/deleteCatalogApp';
import { useToast } from '@/components/ui/Toast';
import Dialog from '@/components/ui/Dialog';
import { DeliveryAppFormModal } from './DeliveryAppFormModal';

interface DeliveryAppRowProps {
  app: CatalogAppRow;
  onViewDetails: (app: CatalogAppRow) => void;
}

export function DeliveryAppRow({ app, onViewDetails }: DeliveryAppRowProps) {
  const t = useTranslations('admin.deliveryApps');
  const format = useFormatter();
  const { toast } = useToast();
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmOpen(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteOpen(true);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditOpen(true);
  };

  const onConfirmToggle = async () => {
    setIsLoading(true);
    const result = await setCatalogAppStatus({
      id: app.id,
      isActive: !app.isActive,
    });
    setIsLoading(false);
    setIsConfirmOpen(false);

    if (result.success) {
      toast(t(`actions.success${app.isActive ? 'Deactivated' : 'Activated'}`), 'success');
    } else {
      toast(result.error || t('actions.error'), 'error');
    }
  };

  const onConfirmDelete = async () => {
    setIsLoading(true);
    const result = await deleteCatalogApp({ id: app.id });
    setIsLoading(false);
    setIsDeleteOpen(false);

    if (result.success) {
      toast(t('actions.successDeleted'), 'success');
    } else {
      toast(result.error || t('actions.error'), 'error');
    }
  };

  return (
    <>
      <tr
        onClick={() => onViewDetails(app)}
        className="group hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors cursor-pointer"
      >
        <td className="py-4 px-4 ps-6">
          <div className="flex items-center gap-3">
            {app.logoUrl ? (
              <img
                src={app.logoUrl}
                alt={app.name}
                className="w-10 h-10 rounded-lg bg-white border border-slate-200 object-contain shadow-sm p-1"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-navy text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {app.name.charAt(0)}
              </div>
            )}
            <span className="text-sm font-bold text-slate-800 truncate group-hover:text-sky transition-colors">
              {app.name}
            </span>
          </div>
        </td>
        
        <td className="py-4 px-4 text-center">
          <span className={cn(
            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
            app.isActive 
              ? "bg-[#5cbf8f]/10 text-[#5cbf8f] border-[#5cbf8f]/20"
              : "bg-red-500/10 text-red-500 border-red-500/20"
          )}>
            {t(`table.status${app.isActive ? 'Active' : 'Inactive'}`)}
          </span>
        </td>

        <td className="py-4 px-4 text-center">
          <span className="text-sm font-bold text-slate-800">{app.brandCount}</span>
        </td>

        <td className="py-4 px-4">
          <span className="text-sm text-slate-500">
            {format.dateTime(new Date(app.createdAt), { dateStyle: 'medium' })}
          </span>
        </td>

        <td className="py-4 px-4 pe-6 text-right">
          <div className="flex justify-end items-center gap-2">
            <button
              onClick={handleEdit}
              className="p-2 rounded-lg text-slate-400 hover:text-sky hover:bg-sky/5 transition-all"
              title={t('actions.edit')}
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={handleToggleStatus}
              className={cn(
                "p-2 rounded-lg transition-all",
                app.isActive 
                  ? "text-slate-400 hover:text-red-500 hover:bg-red-50" 
                  : "text-slate-400 hover:text-[#5cbf8f] hover:bg-[#5cbf8f]/5"
              )}
              title={app.isActive ? t('actions.deactivate') : t('actions.activate')}
            >
              {app.isActive ? <ShieldOff size={18} /> : <ShieldCheck size={18} />}
            </button>
            <button
              onClick={handleDelete}
              disabled={app.brandCount > 0}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-20"
              title={app.brandCount > 0 ? t('actions.deleteDisabledHint') : t('actions.delete')}
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(app);
              }}
              className="p-2 text-slate-400 hover:text-sky hover:bg-sky/5 rounded-lg transition-all"
            >
              <ExternalLink size={18} />
            </button>
          </div>
        </td>
      </tr>

      <Dialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={onConfirmToggle}
        isLoading={isLoading}
        type={app.isActive ? "danger" : "info"}
        title={app.isActive ? t("actions.deactivate") : t("actions.activate")}
        description={app.isActive ? t("actions.confirmDeactivate") : t("actions.confirmActivate")}
      />

      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={onConfirmDelete}
        isLoading={isLoading}
        type="danger"
        title={t("actions.delete")}
        description={t("actions.confirmDelete")}
      />

      <DeliveryAppFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        app={app}
      />
    </>
  );
}
