<script lang="ts">

export default {
	name: 'PropertyDisplay',
	props: {
		label: {
			type: String,
			default: null,
		},
		value: {
			type: [Array, Object, String],
			default: null,
		},
	},
	computed: {
		isArray() {
			return this.value != null && Array.isArray(this.value);
		},
		isObject() {
			return this.value != null && !this.isArray && typeof this.value === 'object';
		},
		isString() {
			return this.value != null && typeof this.value === 'string';
		},
	},
};
</script>

<template>
	<div v-if="label != null" class="text-secondary-grey font-sm font-semibold">
		{{ label }}
	</div>

	<div v-if="isArray">
		<ul class="pl-4">
			<li v-for="item in value" class="list-disc">
				{{ item }}
			</li>
		</ul>
	</div>

	<div v-if="isObject">
		<ul class="pl-4">
			<li v-for="(val, key) in value" class="list-disc">
				<span>
					{{ key }}:
				</span>

				<span class="ml-1">
					{{ val }}
				</span>
			</li>
		</ul>
	</div>

	<div v-if="isString">
		{{ value }}
	</div>
</template>