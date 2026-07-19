import type { Icon } from "@phosphor-icons/react";
import {
  MoneyIcon,
  BriefcaseIcon,
  ChartLineUpIcon,
  DotsThreeCircleIcon,
  HouseIcon,
  LightningIcon,
  ForkKnifeIcon,
  CarIcon,
  BabyIcon,
  GraduationCapIcon,
  HeartbeatIcon,
  ConfettiIcon,
  PawPrintIcon,
  DeviceMobileIcon,
  BankIcon,
  ShieldIcon,
  PiggyBankIcon,
} from "@phosphor-icons/react/dist/ssr";

export const CATEGORIA_ICONS: Record<string, Icon> = {
  // entrada
  salario: MoneyIcon,
  freelance: BriefcaseIcon,
  rendimentos: ChartLineUpIcon,
  // saida
  moradia: HouseIcon,
  contas: LightningIcon,
  alimentacao: ForkKnifeIcon,
  transporte: CarIcon,
  baby: BabyIcon,
  educacao: GraduationCapIcon,
  saude: HeartbeatIcon,
  lazer: ConfettiIcon,
  pets: PawPrintIcon,
  assinaturas: DeviceMobileIcon,
  "taxas-impostos": BankIcon,
  // investimento (categorias legadas, mantidas para lançamentos antigos)
  "reserva-bebe": PiggyBankIcon,
  "reserva-emergencia": ShieldIcon,
  previdencia: BankIcon,
  acoes: ChartLineUpIcon,
  // comum
  outros: DotsThreeCircleIcon,
};

export function categoriaIcon(categoria: string): Icon {
  return CATEGORIA_ICONS[categoria] ?? DotsThreeCircleIcon;
}
