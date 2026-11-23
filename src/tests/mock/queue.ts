export const QUEUE = {
	title: 'Тестовый заказ',
	viewerName: 'Зритель',
	queueId: 1,
	userId: 15,
	requestInput: { title: '  Тестовый заказ  ', viewerName: '  Зритель  ' },
	tooLongTitle: 'а'.repeat(256),
	tooLongViewerName: 'а'.repeat(101),
	formError: 'Не удалось добавить заказ. Попробуйте позже.',
	invalidErrors: { formErrors: [], fieldErrors: { title: ['Введите название заказа'] } },
	failureResponse: {
		type: 'failure',
		status: 500,
		data: JSON.stringify([
			{ status: 1, errors: 2 },
			'error',
			{ formErrors: 3, fieldErrors: 5 },
			[4],
			'Не удалось добавить заказ. Попробуйте позже.',
			{}
		])
	},
	description: 'Описание заказа',
	missingId: -1,
	invalidStatus: 'unknown',
	olderDate: new Date('2026-01-01T00:00:00Z'),
	newerDate: new Date('2026-01-02T00:00:00Z'),
	activeTitle: 'Активный заказ',
	waitingTitle: 'Ожидающий заказ',
	deferredTitle: 'Отложенный заказ',
	completedTitle: 'Выполненный заказ',
	pageRequests: [
		{
			id: 1,
			title: 'Отложенный заказ',
			viewerName: 'Зритель',
			description: null,
			status: 'deferred' as const,
			position: 1
		},
		{
			id: 2,
			title: 'Активный заказ',
			viewerName: 'Зритель',
			description: null,
			status: 'active' as const,
			position: null
		},
		{
			id: 3,
			title: 'Ожидающий заказ',
			viewerName: 'Зритель',
			description: null,
			status: 'waiting' as const,
			position: 1
		},
		{
			id: 4,
			title: 'Выполненный заказ',
			viewerName: 'Зритель',
			description: null,
			status: 'completed' as const,
			position: null
		}
	],
	statusesWithPosition: ['waiting', 'deferred'] as const,
	statusesWithoutPosition: ['active', 'completed', 'canceled', 'deleted'] as const
};
