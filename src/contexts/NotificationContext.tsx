'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SuccessModal } from '@/components/notifications/SuccessModal';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';

interface NotificationContextType {
  showSuccessModal: (options: SuccessModalOptions) => void;
  showSuccessToast: (message?: string) => void;
}

interface SuccessModalOptions {
  title?: string;
  message?: string;
  onDownload?: () => void;
  onViewFile?: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: SuccessModalOptions;
  }>({
    isOpen: false,
    options: {},
  });

  const showSuccessModal = useCallback((options: SuccessModalOptions) => {
    setModalState({ isOpen: true, options });
  }, []);

  const hideSuccessModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showSuccessToast = useCallback((message: string = "File processed successfully") => {
    toast({
      duration: 4000,
      className: 'border-emerald-500 bg-background text-foreground shadow-2xl',
      description: (
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-bold">{message}</span>
        </div>
      ),
    });
  }, [toast]);

  const value = {
    showSuccessModal,
    showSuccessToast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <SuccessModal
        open={modalState.isOpen}
        onOpenChange={hideSuccessModal}
        {...modalState.options}
      />
    </NotificationContext.Provider>
  );
};
