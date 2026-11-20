<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { CircleUser, Menu } from '@lucide/svelte';
	import { DropdownMenu } from 'bits-ui';

	type Props = {
		class?: string;
		user: Pick<NonNullable<App.Locals['user']>, 'email' | 'displayName' | 'avatar'> | null;
		error?: string;
	};

	let { class: className = '', user, error }: Props = $props();
	let logoutForm: HTMLFormElement;
</script>

<div class={['userMenu', className]}>
	<form method="POST" action="?/logout" use:enhance bind:this={logoutForm}></form>
	<DropdownMenu.Root>
		<DropdownMenu.Trigger class="user-menu__trigger" aria-label="Меню пользователя">
			<Menu size="100%" />
		</DropdownMenu.Trigger>

		<DropdownMenu.Portal>
			<DropdownMenu.Content class="user-menu__content" side="left" align="start" sideOffset={8}>
				<div class="user-menu__profile">
					{#if user?.avatar}
						<img class="user-menu__avatar" src={user.avatar} alt="" />
					{:else}
						<CircleUser class="user-menu__avatar" size={32} strokeWidth={1.25} />
					{/if}
					<span class="user-menu__name" title={user?.displayName || user?.email}
						>{user?.displayName || user?.email}</span
					>
				</div>

				<DropdownMenu.Item class="user-menu__item">
					{#snippet child({ props })}
						<a {...props} href={resolve('/(protected)/settings')}>Настройки</a>
					{/snippet}
				</DropdownMenu.Item>
				<DropdownMenu.Item
					class="user-menu__item user-menu__item_logout"
					onSelect={() => logoutForm.requestSubmit()}>Выйти</DropdownMenu.Item
				>
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>
	{#if error}
		<p class="user-menu__error" role="alert">{error}</p>
	{/if}
</div>

<style lang="scss">
	@use './user-menu.scss';
</style>
