import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SessionForm } from '../components/session-form';
import { CCRPageWrapper } from '../../components/ccr-page-wrapper';

export default function NovaSessaoPage() {
  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Sessões', href: '/ccr/sessoes' },
    { label: 'Novo' }
  ];

  return (
    <CCRPageWrapper title="Nova Sessão" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Sessão</CardTitle>
          <CardDescription>
            Preencha as informações da nova sessão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionForm />
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
