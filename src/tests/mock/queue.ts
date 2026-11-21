export const QUEUE = {
	title: 'Тестовый заказ',
	viewerName: 'Зритель',
	description: 'Описание заказа',
	missingId: -1,
	invalidStatus: 'unknown',
	statusesWithPosition: ['waiting', 'deferred'] as const,
	statusesWithoutPosition: ['active', 'completed', 'canceled', 'deleted'] as const
};
