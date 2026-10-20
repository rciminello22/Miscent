import { FormerSpacesScreen } from '@/features/spaces/FormerSpacesScreen';

/** P26 · "Espacios que dejaste" del invitado (Estado B): sin pestañas. */
export default function DejadosInvitado() {
  return <FormerSpacesScreen inTabs={false} />;
}
