import { defineStore } from "pinia";
import { getDocument } from '@/lib/http';
import { splitJson } from "@/lxljs/data";
import { getCard, getChip, getItemLabel, getItemSummary } from '@/lxljs/display';
import { getResources } from '@/lib/resources';
import { getAtPath, getFnurgelFromUri, getFullImageUrl, asArray, unwrap, sortInstances } from '@/lib/item';
import { isLink } from "@/lib/jsonld";
import getSettings from '@/lib/settings';

import { getRecordType } from "@/lxljs/vocab";

export const useProductStore = defineStore('product', {
	state: () => ({
		current: null,
		parentEntity: null,
		mainEntity: null,
		quoted: null,
		record: null,
	}),
	getters: {
		productType: (state) => {
			if (state.mainEntity != null) {
				const resources = getResources();
				return getRecordType(state.mainEntity['@type'], resources.vocab, resources.context).toLowerCase();
			}

			return null;
		},
		instances: (state) => {
			const instances = getAtPath(state.mainEntity, ['@reverse', 'instanceOf'])
				.map((i) => isLink(i) ? state.quoted[i['@id']] : i);
			return sortInstances(instances);
		},
		instanceTitle: (state) => {
			if (state.instances != null) {
				return state.instances.map((i) => {
					const titles = getAtPath(i, ['hasTitle', '*']);
					return getItemLabel(titles[0], getResources(), state.quoted, getSettings());
				});
			}
		},
		workChip: (state) => {
            if (state.mainEntity != null) {
                return getChip(state.mainEntity, getResources(), state.quoted, getSettings());
            }
        },
		workCard: (state) => {
			if (state.mainEntity != null) {
				return getCard(state.mainEntity, getResources(), state.quoted, getSettings());
			}
		},
		contributions: (state) => {
			const settings = getSettings();
			// FIXME
			if (state.mainEntity != null) {
				return getAtPath(state.mainEntity, ['contribution', '*']).map(c => {
					return {
						'role': asArray(c.role).map(r => getItemLabel(r, getResources(), state.quoted, settings)),
						'agent': getItemLabel(unwrap(c.agent), getResources(), state.quoted, settings),
						'link': getFnurgelFromUri(unwrap(asArray(c.agent).map(a => a['@id']))),
						'isPrimary': c['@type'] === "PrimaryContribution" || asArray(c.role).some(r => r['@id'] === "http://id.kb.se/relator/primaryRightsHolder")
					}
				}).sort((a, b) => Number(b['isPrimary']) - Number(a['isPrimary']));
			}
		},
		subjectSchemes: (state) => {
			const schemes = [...new Set(state.subjects.map(s => s?.inScheme))];
			return schemes.map(scheme => {
				return {
					'scheme': scheme,
					'subjects': state.subjects.filter(subject => subject.inScheme === scheme)
				}
			});
		},
		subjects: (state) => {
			if (state.mainEntity != null) {
				const settings = getSettings();
				return getAtPath(state.mainEntity, ['subject', '*']).map(s => {
					if (s['@id'] != null && state.quoted[s['@id']]) {
						const inScheme = state.quoted[s['@id']].inScheme;
						let schemeLabel = '';
						if (inScheme) {
							const chip = getChip(inScheme, getResources(), state.quoted, settings);
							if (chip.hasOwnProperty('title')) {
								schemeLabel = chip.title;
							} else if (chip.hasOwnProperty('prefLabel')) {
								schemeLabel = chip.prefLabel;
							}
						}
						return {
							'inScheme': schemeLabel,
							'subject': getItemLabel(s, getResources(), state.quoted, settings),
							'link': `find?o=${encodeURI(s['@id'])}&@type=Work&_limit=40&_sort=`
						}
					} else {
						return {
							'inScheme': 'Övriga',
							'subject': getItemLabel(s, getResources(), state.quoted, settings),
						}
					}
				}).filter(s => s != null)
					.filter(s => !s.subject.includes('{'))
					.sort((a, b) => {
							return a.inScheme.localeCompare(b.inScheme, settings.language);
						}
					)
			}
		},
		gfSchemes: (state) => {
			const schemes = [...new Set((state.genreForms).map(gf => gf?.inScheme))];
			return schemes.map(scheme => {
				return {
					'scheme': scheme,
					'genreForms': state.genreForms.filter(gf => gf.inScheme === scheme)
				}
			});
		},
		genreForms: (state) => {
			if (state.mainEntity != null) {
				const settings = getSettings();
				return getAtPath(state.mainEntity, ['genreForm', '*']).map(gf => {
					if (gf['@id'] != null && state.quoted[gf['@id']]) {
						const inScheme = state.quoted[gf['@id']].inScheme;
						let schemeLabel = '';
						if (inScheme) {
							const chip = getChip(inScheme, getResources(), state.quoted, settings);
							if (chip.hasOwnProperty('title')) {
								schemeLabel = chip.title;
							} else if (chip.hasOwnProperty('prefLabel')) {
								schemeLabel = chip.prefLabel;
							}
						}
						return {
							'inScheme': schemeLabel,
							'genreForm': getItemLabel(gf, getResources(), state.quoted, settings),
							'link': `find?o=${encodeURI(gf['@id'])}&@type=Work&_limit=40&_sort=`
						}
					} else {
						return {
							'inScheme': 'Övriga',
							'genreForm': getItemLabel(gf, getResources(), state.quoted, settings),
						}
					}
				}).filter(gf => gf != null)
					.filter(gf => !gf.genreForm.includes('{'))
					.sort((a, b) => {
							return a.inScheme.localeCompare(b.inScheme, settings.language);
						}
					)
			}
		},
		classifications: (state) => {
			if (state.mainEntity != null) {
				return getAtPath(state.mainEntity, ['classification', '*', 'code']);
			}
		},
		author: (state) => {
			if (state.mainEntity != null) {
				return getAtPath(state.mainEntity, ['contribution', '*']).find(c => {
					if (c.role == null) {
						return false;
					}

					if (Array.isArray(c.role)) {
						return c.role.find((r) => r['@id'].indexOf('author') > -1);
					} else {
						return c.role['@id'].indexOf('author') > -1;
					}
				});
			}
		},
        itemSummary: (state) => {
            if (state.mainEntity != null) {
                return getItemSummary(
                    state.mainEntity,
                    getResources(),
                    state.quoted,
                    getSettings(),
                    getResources().displayGroups,
                );
            }

            return null;
        },
		imageUrl: (state) => {
			let foundInstance = state.instances.find((instance) => {
				return instance.identifiedBy != null && instance.identifiedBy.find((identify) =>
					identify['@type'] == 'ISBN'
				);
			});

			if (foundInstance == null && state.instances.length > 0) {
				foundInstance = state.instances[0];
			}

			if (foundInstance != null) {
				return getFullImageUrl(getFnurgelFromUri(foundInstance['@id']), getAtPath(foundInstance, ['identifiedBy', 0, 'value', '']));
			}

			return '';
		},
	},
	actions: {
		async getProduct(documentId) {
			let response = await getDocument(`${documentId}/data.jsonld`);
			let split = splitJson(response.data);

			if (isLink(split.mainEntity.instanceOf)) {
				this.parentEntity = split.mainEntity;

				response = await getDocument(`${this.parentEntity.instanceOf['@id']}/data.jsonld`);
				split = splitJson(response.data);
			} else if (split.mainEntity.instanceOf) {
				const instance = split.mainEntity;
				const work = instance.instanceOf;
				delete instance.instanceOf;
				work['@reverse'] = {'instanceOf': [instance]};
				split.mainEntity = work;
			}

			this.current = response.data;
			this.mainEntity = split.mainEntity;
			this.quoted = split.quoted;
			this.record = split.record;
		},
	},
});