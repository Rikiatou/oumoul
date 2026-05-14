import { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { palette } from '../theme';
import { HelpTip } from '../components/HelpTip';

// Nisab thresholds (approximate)
const GOLD_NISAB_GRAMS = 85; // 85g of gold
const SILVER_NISAB_GRAMS = 595; // 595g of silver
const ZAKAT_RATE = 0.025; // 2.5%

interface AssetCategory {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const ASSET_CATEGORIES: AssetCategory[] = [
  { id: 'cash', label: 'Argent liquide', icon: 'cash', description: 'Espèces, comptes bancaires, épargne' },
  { id: 'gold', label: 'Or', icon: 'diamond', description: 'Bijoux en or, lingots, pièces' },
  { id: 'silver', label: 'Argent (métal)', icon: 'ellipse', description: 'Bijoux en argent, lingots' },
  { id: 'investments', label: 'Investissements', icon: 'trending-up', description: 'Actions, fonds, crypto-monnaies' },
  { id: 'business', label: 'Commerce', icon: 'storefront', description: 'Stock, marchandises, créances' },
  { id: 'property', label: 'Immobilier locatif', icon: 'home', description: 'Revenus locatifs (pas résidence principale)' },
];

const CURRENCIES = [
  { code: 'XAF', symbol: 'FCFA', label: 'Franc CFA' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'Dollar US' },
  { code: 'GBP', symbol: '£', label: 'Livre sterling' },
  { code: 'MAD', symbol: 'MAD', label: 'Dirham marocain' },
];

// Approximate gold price per gram in different currencies
const GOLD_PRICE_PER_GRAM: Record<string, number> = {
  XAF: 45000,
  EUR: 68,
  USD: 75,
  GBP: 59,
  MAD: 720,
};

export function ZakatCalculatorScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [assets, setAssets] = useState<Record<string, string>>({});
  const [debts, setDebts] = useState('');
  const [showResult, setShowResult] = useState(false);

  const updateAsset = useCallback((id: string, value: string) => {
    setAssets((prev) => ({ ...prev, [id]: value }));
    setShowResult(false);
  }, []);

  const parseNum = (s: string) => {
    const n = parseFloat(s.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const calculation = useMemo(() => {
    const totalAssets = Object.values(assets).reduce((sum, v) => sum + parseNum(v), 0);
    const totalDebts = parseNum(debts);
    const netWealth = Math.max(0, totalAssets - totalDebts);
    const goldPrice = GOLD_PRICE_PER_GRAM[currency.code] ?? 75;
    const nisab = GOLD_NISAB_GRAMS * goldPrice;
    const isAboveNisab = netWealth >= nisab;
    const zakatDue = isAboveNisab ? netWealth * ZAKAT_RATE : 0;

    return {
      totalAssets,
      totalDebts,
      netWealth,
      nisab,
      isAboveNisab,
      zakatDue,
      goldPrice,
    };
  }, [assets, debts, currency]);

  const formatAmount = (n: number) => {
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${currency.symbol}`;
  };

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={st.header}>
        <BackButton onPress={onBack} />
        <Text style={st.headerTitle} accessibilityRole="header">Calculateur Zakat</Text>
        <HelpTip screenName="Calculateur Zakat" tips={[
          { icon: 'calculator', title: 'Calcul automatique', description: 'Entre tes actifs et dettes, la zakat (2.5%) est calculée automatiquement.' },
          { icon: 'cash', title: 'Nisab', description: 'Le Nisab est le seuil minimum de richesse. Si tes actifs dépassent ce seuil, la zakat est due.' },
          { icon: 'wallet', title: '6 catégories d\'actifs', description: 'Épargne, or, argent, investissements, commerce et immobilier.' },
          { icon: 'globe', title: '5 devises', description: 'FCFA, EUR, USD, GBP et MAD sont supportées.' },
        ]} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={st.infoBanner}>
          <Ionicons name="information-circle" size={20} color={palette.primaryDark} />
          <Text style={st.infoText}>
            La Zakat est de 2,5% de la richesse nette au-dessus du Nisab (seuil minimum).
            Le Nisab est basé sur 85g d'or.
          </Text>
        </View>

        {/* Currency Selector */}
        <TouchableOpacity style={st.currencyBtn} onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}>
          <Text style={st.currencyLabel}>Devise</Text>
          <View style={st.currencyValue}>
            <Text style={st.currencyText}>{currency.symbol} — {currency.label}</Text>
            <Ionicons name="chevron-down" size={16} color={palette.textSoft} />
          </View>
        </TouchableOpacity>

        {showCurrencyPicker && (
          <View style={st.currencyPicker}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[st.currencyOption, currency.code === c.code && st.currencyOptionActive]}
                onPress={() => { setCurrency(c); setShowCurrencyPicker(false); setShowResult(false); }}
              >
                <Text style={[st.currencyOptionText, currency.code === c.code && { color: '#fff' }]}>
                  {c.symbol} — {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Nisab Info */}
        <View style={st.nisabCard}>
          <Text style={st.nisabLabel}>Nisab actuel ({currency.symbol})</Text>
          <Text style={st.nisabValue}>{formatAmount(calculation.nisab)}</Text>
          <Text style={st.nisabSub}>Basé sur 85g d'or à ~{formatAmount(calculation.goldPrice)}/g</Text>
        </View>

        {/* Asset Inputs */}
        <Text style={st.sectionTitle}>Tes avoirs</Text>
        {ASSET_CATEGORIES.map((cat) => (
          <View key={cat.id} style={st.inputRow}>
            <View style={st.inputIcon}>
              <Ionicons name={cat.icon} size={18} color={palette.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.inputLabel}>{cat.label}</Text>
              <Text style={st.inputDesc}>{cat.description}</Text>
            </View>
            <TextInput
              style={st.amountInput}
              placeholder="0"
              placeholderTextColor={palette.muted}
              value={assets[cat.id] ?? ''}
              onChangeText={(v) => updateAsset(cat.id, v)}
              keyboardType="numeric"
            />
          </View>
        ))}

        {/* Debts */}
        <Text style={[st.sectionTitle, { marginTop: 20 }]}>Tes dettes</Text>
        <View style={st.inputRow}>
          <View style={st.inputIcon}>
            <Ionicons name="remove-circle" size={18} color="#D32F2F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.inputLabel}>Total des dettes</Text>
            <Text style={st.inputDesc}>Prêts, crédits, factures dues</Text>
          </View>
          <TextInput
            style={st.amountInput}
            placeholder="0"
            placeholderTextColor={palette.muted}
            value={debts}
            onChangeText={(v) => { setDebts(v); setShowResult(false); }}
            keyboardType="numeric"
          />
        </View>

        {/* Calculate Button */}
        <TouchableOpacity style={st.calcBtn} onPress={() => setShowResult(true)} activeOpacity={0.8}>
          <Ionicons name="calculator" size={20} color="#fff" />
          <Text style={st.calcBtnText}>Calculer la Zakat</Text>
        </TouchableOpacity>

        {/* Result */}
        {showResult && (
          <View style={st.resultCard}>
            <View style={st.resultRow}>
              <Text style={st.resultLabel}>Total des avoirs</Text>
              <Text style={st.resultValue}>{formatAmount(calculation.totalAssets)}</Text>
            </View>
            <View style={st.resultRow}>
              <Text style={st.resultLabel}>Total des dettes</Text>
              <Text style={[st.resultValue, { color: '#D32F2F' }]}>- {formatAmount(calculation.totalDebts)}</Text>
            </View>
            <View style={st.resultDivider} />
            <View style={st.resultRow}>
              <Text style={st.resultLabel}>Richesse nette</Text>
              <Text style={[st.resultValue, { fontWeight: '700' }]}>{formatAmount(calculation.netWealth)}</Text>
            </View>
            <View style={st.resultRow}>
              <Text style={st.resultLabel}>Nisab</Text>
              <Text style={st.resultValue}>{formatAmount(calculation.nisab)}</Text>
            </View>
            <View style={st.resultDivider} />

            {calculation.isAboveNisab ? (
              <View style={st.zakatResult}>
                <Ionicons name="checkmark-circle" size={24} color="#388E3C" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.zakatLabel}>Zakat à payer (2,5%)</Text>
                  <Text style={st.zakatAmount}>{formatAmount(calculation.zakatDue)}</Text>
                </View>
              </View>
            ) : (
              <View style={st.zakatResult}>
                <Ionicons name="information-circle" size={24} color="#F57C00" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.zakatLabel}>Pas de Zakat obligatoire</Text>
                  <Text style={st.zakatSub}>
                    Ta richesse nette ({formatAmount(calculation.netWealth)}) est en dessous du Nisab ({formatAmount(calculation.nisab)}).
                  </Text>
                </View>
              </View>
            )}

            <Text style={st.disclaimer}>
              Ce calcul est une estimation. Consulte un savant pour des cas complexes.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: palette.accentLight, borderRadius: 12, padding: 14, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 13, color: palette.text, lineHeight: 20 },
  currencyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: palette.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: palette.border },
  currencyLabel: { fontSize: 14, fontWeight: '600', color: palette.text },
  currencyValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currencyText: { fontSize: 14, color: palette.primaryDark, fontWeight: '600' },
  currencyPicker: { backgroundColor: palette.card, borderRadius: 12, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: palette.border },
  currencyOption: { padding: 10, borderRadius: 8 },
  currencyOptionActive: { backgroundColor: palette.primaryDark },
  currencyOptionText: { fontSize: 14, fontWeight: '600', color: palette.text },
  nisabCard: { backgroundColor: palette.card, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: palette.border, alignItems: 'center' },
  nisabLabel: { fontSize: 12, color: palette.textSoft, fontWeight: '500' },
  nisabValue: { fontSize: 22, fontWeight: '800', color: palette.primaryDark, marginTop: 4 },
  nisabSub: { fontSize: 11, color: palette.muted, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: palette.border },
  inputIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.accentLight, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: palette.text },
  inputDesc: { fontSize: 10, color: palette.muted, marginTop: 1 },
  amountInput: { width: 90, textAlign: 'right', fontSize: 16, fontWeight: '700', color: palette.text, backgroundColor: palette.inputBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: palette.inputBorder },
  calcBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: palette.primaryDark, borderRadius: 14, paddingVertical: 16, marginTop: 24, marginBottom: 16 },
  calcBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  resultCard: { backgroundColor: palette.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: palette.border },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  resultLabel: { fontSize: 14, color: palette.textSoft },
  resultValue: { fontSize: 14, color: palette.text, fontWeight: '600' },
  resultDivider: { height: 1, backgroundColor: palette.border, marginVertical: 8 },
  zakatResult: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.accentLight, borderRadius: 12, padding: 16, marginTop: 12 },
  zakatLabel: { fontSize: 14, fontWeight: '700', color: palette.text },
  zakatAmount: { fontSize: 24, fontWeight: '800', color: palette.primaryDark, marginTop: 4 },
  zakatSub: { fontSize: 12, color: palette.textSoft, marginTop: 4, lineHeight: 18 },
  disclaimer: { fontSize: 11, color: palette.muted, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
