<script>
import { useProductStore } from '@/views/ProductPage/store';
import { getResources } from '@/lib/resources';
import getSettings from '@/lib/settings';
import {getCard, getChip, getDisplayProperties, getItemLabel} from '@/lxljs/display';
import { getLabelByLang } from "@/lxljs/string";
import { mapState } from 'pinia';
import {getImageUrl, getFnurgelFromUri, getAtPath, asArray, unwrap, prepend, getPropertyLabel} from '@/lib/item';
import { getHoldings } from "@/lib/http";
import Holding from "./Holding.vue";
import SidebarModal from '@/components/Modals/Sidebar.vue';
import Expandable from '@/components/Expandable.vue';
import PropertyDisplay from '@/components/PropertyDisplay.vue';

export default {
    name: "Instance",
    components: {
        Holding,
        SidebarModal,
        Expandable,
        PropertyDisplay,
    },
    data() {
        return {
            showHoldings: false,
            isExpanded: false,
            holdings: null,
        }
    },
    props: {
        instance: {
            type: Object,
            default: null
        }
    },
    computed: {
        ...mapState(useProductStore, ['quoted']),

        publications() {
            return getAtPath(this.instance, ['publication']).map((publication) => {
                return getChip(publication, getResources(), this.quoted, getSettings());
            });
        },
        title() {
            return getItemLabel(getAtPath(this.instance, ['hasTitle', 0]), getResources(), this.quoted, getSettings())
        },
        extent() {
            return getItemLabel(getAtPath(this.instance, ['extent', 0]), getResources(), this.quoted, getSettings());
        },
        dimensions() {
            return getItemLabel(getAtPath(this.instance, ['hasDimensions']), getResources(), this.quoted, getSettings())
        },
        responsibilityStatement() {
          const r = getItemLabel(getAtPath(this.instance, ['responsibilityStatement']), getResources(), this.quoted, getSettings())
          return r ? `/ ${r}` : ''
        },
        editionStatement() {
          const e = asArray(getAtPath(this.instance, ['editionStatement']))
          return e.length > 0 ? `/ ${e.join('; ')}` : ''
        },
        imageUrl() {
            return getImageUrl(
                getFnurgelFromUri(this.instance['@id']), 
                getAtPath(this.instance, ['identifiedBy', {'@type': 'ISBN'}, 'value'])
            );
        },
        identifiedBy() {
            return getItemLabel(getAtPath(this.instance, ['identifiedBy', 0]), getResources(), this.quoted, getSettings());
        },
        type() {
            return getLabelByLang(this.instance['@type'], getSettings().language, getResources());
        },
        contributions() {
            const settings = getSettings();
          return getAtPath(this.instance, ['contribution', '*']).map(c => {
            return {
              'role': asArray(c.role).map(r => getItemLabel(r, getResources(), this.quoted, settings)),
              'agent': getItemLabel(unwrap(c.agent), getResources(), this.quoted, settings),
              'link': getFnurgelFromUri(unwrap(asArray(c.agent).map(a => a['@id']))),
              'isPrimary': c['@type'] === "PrimaryContribution" || asArray(c.role).some(r => r['@id'] === "http://id.kb.se/relator/primaryRightsHolder")
            }
          }).sort((a, b) => Number(b['isPrimary']) - Number(a['isPrimary']));
        },
        // holdings() {
        //     return getAtPath(this.instance, ['@reverse', 'itemOf', '*', '@id']).map((holdingId) => {
        //         return this.quoted[holdingId];
        //     });
        // },
        numberOfHoldings() {
            if (typeof this.items != 'undefined') {
                return this.items.length;
            }
        },
        items() {
            if (this.holdings != null) {
                return this.holdings.items;
            }
        },
        fnurgel() {
            return this.$route.params.fnurgel;
        },
        isSelected() {
            if (this.instance != null && getFnurgelFromUri(this.instance['@id']) == this.fnurgel) {
                return true;
            }

            return false;
        },
        detailProperties() {
            const chip = getDisplayProperties(this.instance['@type'], getResources(), getSettings(), 'chips');
            const properties = getDisplayProperties(this.instance['@type'], getResources(), getSettings(), 'full');
            return properties.filter((property) =>
                !chip.includes(property) && this.getValue(property) != null
            );
        },
    },
    methods: {
      prepend,
      asArray,
        getFnurgelFromUri,
        toggleExpanded() {
            this.isExpanded = !this.isExpanded;
        },
      getLabel(label) {
        return getPropertyLabel(label);
      },
      getValue(key) {
        //FIXME: copy-pasted from agentsummary
        const value = this.instance[key];

        if (value != null && typeof value == 'object') {
          const card = getCard(this.instance, getResources(), this.quoted, getSettings());
          if (card.hasOwnProperty(key)) {
            return card[key];
          }
        }

        return value;
      },
    },
    async mounted() {
        // This is necessary unless we embellish the holdings to the work (currently we only get the holding ids).
        this.holdings = await getHoldings(this.instance['@id']).then((response) =>
            response.json()
        );
    },
}
</script>

<template>
    <Card :class="{ ['!border-primary-blue']: isSelected }" :image-url="imageUrl" image-size="sm" icon="fa-book">
        <router-link :to="`/${getFnurgelFromUri(this.instance['@id'])}`" replace class="flex items-center gap-x-2">
            <h2>
              <span class="font-semibold">{{ title }}</span> <span class="text-secondary-grey">{{ responsibilityStatement }} {{ editionStatement }}</span> 
            </h2>
        </router-link>

        <div class="mt-1" v-for="c in contributions">
          <span :class="c.isPrimary ? 'font-semibold' : ''">
            <router-link v-if="c.link" :to="`/${c.link}`" class="underline">{{c.agent}}</router-link>
            <span v-else>{{c.agent}}</span>
          </span>
          <span class="text-secondary-grey"> &bull; {{c.role.join(', ')}}</span>
        </div>

        <div v-for="publication in publications">
            {{ asArray(publication.country).join('; ') }}{{ prepend(' ', asArray(publication.place).join('; ')) }}{{ prepend(' : ', asArray(publication.agent).join(', ')) }}{{ prepend(', ', publication.year) }}
        </div>

        <div class="text-secondary-grey">
            {{ identifiedBy }}
        </div>

        <div>
            {{ extent }}{{ extent && type ? ' • '  : ''}}<span>{{ type }}</span>
        </div>

        <template #footer>
            <div>
                <div class="flex gap-3 items-start">
                    <Button @click="showHoldings = true">
                        Finns på {{numberOfHoldings}} bibliotek
                    </Button>

                    <Button
                        @click="isExpanded = !isExpanded"
                        class="!items-start"
                        :class="{['!border-secondary-grey/20 rounded-b-none border-b-0 z-10 h-14']: isExpanded }"
                    >
                        Detaljer
                        <font-awesome-icon
                            icon="fa-solid fa-chevron-up"
                            class="ml-2 mt-1 transition-all duration-300"
                            :class="{['rotate-180']: !isExpanded }"
                        />
                    </Button>
                </div>

                <Expandable :show="isExpanded">
                    <div
                        class="border rounded-lg relative border-secondary-grey/20 p-4 flex flex-col gap-y-3"
                        style="background: #eaf5f6; top: -1px;"
                    >
                        <div v-for="key in detailProperties" class="mb-4">
                          <PropertyDisplay
                              :label="getLabel(key)"
                              :value="getValue(key)"
                          />
                        </div>
                    </div>
                </Expandable>
            </div>
        </template>
    </Card>

    <SidebarModal v-model="showHoldings">
        <Card class="mb-8" style="background-color: #e1e5f6;" :image-url="imageUrl" image-size="sm" icon="fa-book">
            <router-link :to="`/${getFnurgelFromUri(this.instance['@id'])}`" class="flex items-center gap-x-2">
                <h2 class="font-semibold">
                    {{ title }}
                </h2>

                <div v-for="publication in publications" class="text-secondary-grey">
                    &bull;
                    {{ publication.year }}
                </div>
            </router-link>

            <div>
                {{ identifiedBy }}
            </div>

            <div>
                {{ extent }}
            </div>
        </Card>

        <div class="text-secondary-grey font-semibold mb-2">
            Alla bibliotek
        </div>

        <div class="mb-1" v-for="holding in items">
            <Holding
                :key="holding['@id']"
                :holding="holding"
                :instance-id="getFnurgelFromUri(this.instance['@id'])"
            />
        </div>
    </SidebarModal>
</template>
