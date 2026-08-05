/**
 * Botiga Quick View
 * 
 * jQuery Dependant: true
 * 
 */

'use strict';

var botiga = botiga || {};
botiga.quickView = {
  init: function init() {
    this.build();
    this.events();
  },
  build: function build() {
    var _this = this,
      button = document.querySelectorAll('.botiga-quick-view'),
      popup = document.querySelector('.botiga-quick-view-popup'),
      closeButton = document.querySelector('.botiga-quick-view-popup-close-button'),
      popupContent = document.querySelector('.botiga-quick-view-popup-content-ajax');
    if (null === popup) {
      return false;
    }
    closeButton.addEventListener('click', function (e) {
      e.preventDefault();
    });
    popup.addEventListener('click', function (e) {
      if (null === e.target.closest('.botiga-quick-view-popup-content-ajax')) {
        popup.classList.remove('opened');
      }
    });
    for (var i = 0; i < button.length; i++) {
      button[i].addEventListener('click', function (e) {
        e.preventDefault();
        var productId = e.target.getAttribute('data-product-id'),
          nonce = e.target.getAttribute('data-nonce');
        popup.classList.add('opened');
        popup.classList.add('loading');
        var ajax = new XMLHttpRequest();
        ajax.open('POST', botiga.ajaxurl, true);
        ajax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        ajax.onload = function () {
          if (this.status >= 200 && this.status < 400) {
            // If successful
            popupContent.innerHTML = this.response;
            var $wrapper = jQuery(popupContent);

            // Initialize Quick View ajax add to cart.
            if (botiga.quickView && botiga.quickView.add_to_cart_ajax) {
              botiga.quickView.add_to_cart_ajax.init($wrapper);
            }

            // Initialize gallery 
            var $gallery = $wrapper.find('.woocommerce-product-gallery');
            if ($gallery.length) {
              $gallery.trigger('wc-product-gallery-before-init', [$gallery.get(0), wc_single_product_params]);
              $gallery.wc_product_gallery(wc_single_product_params);
              $gallery.trigger('wc-product-gallery-after-init', [$gallery.get(0), wc_single_product_params]);
            }

            // Initialize variation gallery 
            if (botiga.variationGallery) {
              botiga.variationGallery.init($wrapper);
            }

            // Initialize size chart 
            if (botiga.sizeChart) {
              botiga.sizeChart.init($wrapper);
            }

            // Initialize product swatches mouseover 
            if (botiga.productSwatch && botiga.productSwatch.variationMouseOver) {
              botiga.productSwatch.variationMouseOver();
            }

            // Initialize product variable
            var variationsForm = document.querySelector('.botiga-quick-view-summary .variations_form');
            if (typeof wc_add_to_cart_variation_params !== 'undefined') {
              jQuery(variationsForm).wc_variation_form();
            }
            botiga.qtyButton.init('quick-view');
            if (typeof botiga.wishList !== 'undefined') {
              botiga.wishList.init();
            }
            $wrapper.find('.variations_form').each(function () {
              if (jQuery(this).data('misc-variations') === true) {
                return false;
              }

              // Move reset button
              botiga.misc.moveResetVariationButton(jQuery(this));

              // First load
              botiga.misc.checkIfHasVariationSelected(jQuery(this));

              // on change variation select
              jQuery(this).on('woocommerce_variation_select_change', function () {
                botiga.misc.checkIfHasVariationSelected(jQuery(this));
              });
              jQuery(this).data('misc-variations', true);
            });
            window.dispatchEvent(new Event('botiga.quickview.ajax.loaded'));
            popup.classList.remove('loading');
          }
        };
        ajax.send('action=botiga_quick_view_content&product_id=' + productId + '&nonce=' + nonce);
      });
    }
  },
  events: function events() {
    var _this = this;
    window.addEventListener('botiga.carousel.initialized', function () {
      _this.build();
    });
  }
};
botiga.quickView.add_to_cart_ajax = {
  isBound: false,
  isProcessing: false,
  init: function init() {
    if (this.isBound) {
      return;
    }
    this.bindEvents();
    this.isBound = true;
  },
  bindEvents: function bindEvents() {
    var _this2 = this;
    var addToCartSelector = '.botiga-quick-view-summary form.cart .single_add_to_cart_button';
    jQuery(document).on('click', addToCartSelector, function (event) {
      var $button = jQuery(event.currentTarget);
      var $form = $button.closest('form.cart');

      // If it's disabled, let Woo handle it.
      if ($button.hasClass('disabled') || $button.prop('disabled')) {
        return;
      }

      // Prevent default form submit, we handle via Ajax.
      event.preventDefault();
      event.stopPropagation();

      // Bail early if a request is already running.
      if (_this2.isProcessing) {
        return;
      }

      // For safety: if no form/action, fall back to default behavior.
      if (!$form.length || !$form.attr('action')) {
        return;
      }
      _this2.isProcessing = true;
      var productId = $button.val() || $form.find('input[name="add-to-cart"]').val() || $form.find('input[name="product_id"]').val();
      var requestData = _this2.buildRequestData($form, productId);
      var $insertTarget = _this2.getNoticeTarget();

      // Mark last result as failed until proven otherwise.
      $button.data('botigaQuickViewLastResult', 'error');
      jQuery(document.body).trigger('adding_to_cart', [$button, requestData]);
      jQuery.ajax({
        type: 'POST',
        url: $form.attr('action'),
        data: requestData,
        beforeSend: function beforeSend() {
          $button.prop('disabled', true);
          $button.removeClass('added').addClass('loading');
          _this2.clearNotices($insertTarget);
        },
        complete: function complete() {
          $button.prop('disabled', false);
          $button.addClass('added').removeClass('loading');
          _this2.isProcessing = false;
        },
        success: function success(responseHtml) {
          // Refresh fragments first (mini-cart, counters, etc.).
          _this2.refreshFragments();
          var $response = jQuery(responseHtml);
          var hasError = Boolean($response.find('.woocommerce-error').length);
          var hasMessage = Boolean($response.find('.woocommerce-message').length);
          if (hasError) {
            _this2.renderNotice('error', $response, $insertTarget);
            $button.data('botigaQuickViewLastResult', 'error');

            // Do NOT close modal on error.
            return;
          }
          if (hasMessage) {
            _this2.renderNotice('message', $response, $insertTarget);
            $button.data('botigaQuickViewLastResult', 'success');

            // Trigger Woo event for compatibility.
            jQuery(document.body).trigger('added_to_cart', [null, null, $button]);

            // Optional close (kept commented as requested).
            setTimeout(function () {
              // botiga.quickView.close();
            }, 300);
            return;
          }

          // If neither error nor message exists, keep modal open.
        },
        error: function error() {
          _this2.isProcessing = false;
          jQuery(document.body).trigger('wc_ajax_error', [$button]);
        }
      });
    });
  },
  buildRequestData: function buildRequestData($form, productId) {
    var serialized = $form.serialize();

    // Ensure add-to-cart is present and matches clicked product button value.
    if (productId) {
      return "add-to-cart=".concat(encodeURIComponent(productId), "&").concat(serialized);
    }
    return serialized;
  },
  getNoticeTarget: function getNoticeTarget() {
    var $popupContent = jQuery('.botiga-quick-view-popup-content-ajax');
    if (!$popupContent.length) {
      return jQuery('.botiga-quick-view-popup-content-ajax');
    }
    var $notices = $popupContent.find('.woocommerce-notices-wrapper');
    if (!$notices.length) {
      $notices = jQuery('<div class="woocommerce-notices-wrapper"></div>');
      $popupContent.prepend($notices);
    }
    return $notices;
  },
  clearNotices: function clearNotices($target) {
    if (!$target || !$target.length) {
      return;
    }
    $target.find('.woocommerce-error, .woocommerce-message, .woocommerce-info').remove();
  },
  renderNotice: function renderNotice(type, $response, $target) {
    if (!$target || !$target.length) {
      return;
    }
    var selector = ".woocommerce-".concat(type);
    var $newNotice = $response.find(selector).first();
    if (!$newNotice.length) {
      return;
    }

    // Clone to avoid moving nodes out of $response.
    $target.append($newNotice.clone(true, true));
  },
  refreshFragments: function refreshFragments() {
    var ajaxUrl = window.woocommerce_params && window.woocommerce_params.ajax_url ? window.woocommerce_params.ajax_url : window.botiga && window.botiga.ajaxurl ? window.botiga.ajaxurl : '';
    if (!ajaxUrl) {
      return;
    }
    jQuery.ajax({
      type: 'POST',
      url: ajaxUrl,
      data: {
        action: 'woocommerce_get_refreshed_fragments'
      },
      success: function success(response) {
        if (!response || !response.fragments) {
          return;
        }
        jQuery.each(response.fragments, function (key, value) {
          jQuery(key).replaceWith(value);
        });
        jQuery('body').trigger('wc_fragments_refreshed');
      }
    });
  }
};
jQuery(document).ready(function () {
  botiga.quickView.init();
});