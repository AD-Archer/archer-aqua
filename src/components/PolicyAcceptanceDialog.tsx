import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { acceptPrivacy, acceptTerms, type ApiUserResponse } from '@/lib/api';
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from '@/lib/policies';
import { toast } from 'sonner';

interface PolicyAcceptanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requiresPrivacy: boolean;
  requiresTerms: boolean;
  onAccepted: (user: ApiUserResponse) => void;
}

export function PolicyAcceptanceDialog({
  isOpen,
  onClose,
  requiresPrivacy,
  requiresTerms,
  onAccepted,
}: PolicyAcceptanceDialogProps) {
  const [acceptPrivacyChecked, setAcceptPrivacyChecked] = useState(false);
  const [acceptTermsChecked, setAcceptTermsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if ((requiresPrivacy && !acceptPrivacyChecked) || (requiresTerms && !acceptTermsChecked)) {
      toast.error('Please accept all required policies');
      return;
    }

    setIsSubmitting(true);
    try {
      let user: ApiUserResponse | undefined;

      if (requiresPrivacy) {
        user = await acceptPrivacy(CURRENT_PRIVACY_VERSION);
      }

      if (requiresTerms) {
        user = await acceptTerms(CURRENT_TERMS_VERSION);
      }

      // At least one policy should have been required, so user should be defined
      if (user) {
        onAccepted(user);
      }

      toast.success('Policies accepted successfully!');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept policies';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Policy Update Required</DialogTitle>
          <DialogDescription>
            Our policies have been updated. Please review and accept the latest versions to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {requiresPrivacy && (
            <div className="flex items-start space-x-3">
              <Checkbox
                id="accept-privacy"
                checked={acceptPrivacyChecked}
                onCheckedChange={(checked) => setAcceptPrivacyChecked(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="accept-privacy" className="text-sm font-medium">
                  I accept the updated{' '}
                                  <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </a>
                </Label>
              </div>
            </div>
          )}

          {requiresTerms && (
            <div className="flex items-start space-x-3">
              <Checkbox
                id="accept-terms"
                checked={acceptTermsChecked}
                onCheckedChange={(checked) => setAcceptTermsChecked(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="accept-terms" className="text-sm font-medium">
                  I accept the updated{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Terms of Service
                  </a>
                </Label>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={
                isSubmitting ||
                (requiresPrivacy && !acceptPrivacyChecked) ||
                (requiresTerms && !acceptTermsChecked)
              }
            >
              {isSubmitting ? 'Accepting...' : 'Accept & Continue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}