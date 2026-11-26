import { describe, expect, it } from 'vitest';
import { moveRequest } from '../../lib/utils/request';

const requests = [
	{ id: 1, status: 'waiting', position: 1 },
	{ id: 2, status: 'waiting', position: 2 },
	{ id: 3, status: 'waiting', position: 3 },
	{ id: 4, status: 'deferred', position: 1 },
	{ id: 5, status: 'deferred', position: 2 },
	{ id: 6, status: 'deferred', position: 3 }
];

describe('изменение порядка заказов', () => {
	it.each([
		[3, 1, [3, 1, 2, 4, 5, 6]],
		[1, 2, [2, 1, 3, 4, 5, 6]],
		[6, 1, [1, 2, 3, 6, 4, 5]],
		[4, 2, [1, 2, 3, 5, 4, 6]],
		[1, 3, [2, 3, 1, 4, 5, 6]],
		[4, 3, [1, 2, 3, 5, 6, 4]]
	])('перемещает заказ %i на позицию %i в своей группе', (id, position, expected) => {
		const result = moveRequest(requests, id, position);
		expect(result.map((request) => request.id)).toEqual(expected);
		expect(result.map((request) => request.position)).toEqual([1, 2, 3, 1, 2, 3]);
	});
});
