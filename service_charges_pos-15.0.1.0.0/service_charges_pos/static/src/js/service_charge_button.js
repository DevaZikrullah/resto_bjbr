odoo.define('service_charges_pos.ServiceChargeButton', function(require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const Registries = require('point_of_sale.Registries');
    const {useListener} = require("@web/core/utils/hooks");

    class ServiceChargeButton extends PosComponent {
        setup() {
            super.setup();
            useListener('click', this._onClick);
        }

        async _onClick() {
            if (!this.env.pos.config.has_service_charge) {
                return;
            }

            const order = this.env.pos.get_order();
            const visibility = this.env.pos.config.config_visibility;
            let product, startingValue, selectionType;

            // Get service product and configuration
            if (visibility === 'global') {
                product = this.env.pos.db.get_product_by_id(this.env.pos.config.config_product_id[0]);
                startingValue = parseInt(this.env.pos.config.config_charge);
                selectionType = this.env.pos.config.config_selection;
            } else {
                product = this.env.pos.db.get_product_by_id(this.env.pos.config.service_product_id[0]);
                startingValue = this.env.pos.config.service_charge;
                selectionType = this.env.pos.config.charge_type;
            }

            if (!product) {
                await this.showPopup('ErrorPopup', {
                    title: this.env._t("No service product found"),
                    body: this.env._t("The service product seems misconfigured. Make sure it is flagged as 'Can be Sold' and 'Available in Point of Sale'."),
                });
                return;
            }

            // Show popup to enter service charge
            const { confirmed, payload } = await this.showPopup('NumberPopup', {
                title: this.env._t('Service Charge'),
                startingValue: startingValue,
                isInputSelected: true
            });

            if (confirmed && payload > 0) {
                let price;

                if (selectionType === 'amount') {
                    price = payload; // Fixed amount
                } else {
                    // Percentage of last product only
                    const lastOrderLine = order.get_last_orderline();
                    const lastProductTotal = lastOrderLine ? lastOrderLine.get_unit_price() * lastOrderLine.get_quantity() : 0;
                    price = payload / 100 * lastProductTotal;
                }

                // Check if service line already exists, if so, add new line instead of merging
                order.add_product(product, { price: price });
            }
        }
    }

    ServiceChargeButton.template = 'service_charges_pos.ServiceChargeButton';

    ProductScreen.addControlButton({
        component: ServiceChargeButton,
        condition: function() {
            return true;
        },
    });

    Registries.Component.add(ServiceChargeButton);
    return ServiceChargeButton;
});
