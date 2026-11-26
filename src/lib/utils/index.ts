const RUSSIAN_PLURAL_RULES = new Intl.PluralRules('ru');

export function getVerbForm(count: number, singular: string, plural: string): string {
	return RUSSIAN_PLURAL_RULES.select(count) === 'one' ? singular : plural;
}
