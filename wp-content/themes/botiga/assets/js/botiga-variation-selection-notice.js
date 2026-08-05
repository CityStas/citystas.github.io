"use strict";

/* global wc_add_to_cart_variation_params, botigaVariationNotice */
/**
 * Botiga – Variation Selection Notice.
 *
 * Enhances WooCommerce variable products by:
 * - Blocking Add to Cart / Buy Now actions until all variations are selected.
 * - Replacing WooCommerce alert() with an inline, accessible notice.
 * - Keeping the notice persistent across AJAX-driven DOM refreshes.
 *
 * @since 2.4.0
 */
(function ($, window, document) {
  'use strict';

  /**
   * Internal state.
   *
   * Stores whether a notice has been explicitly requested
   * (by user interaction) for a given product ID.
   */
  var noticeIdPrefix = 'botiga-variation-selection-notice-';
  var showNoticeByProductId = new Map();

  /**
   * Get product ID from a variation form.
   *
   * @param {jQuery} $form Variation form.
   * @return {number} Product ID or 0.
   */
  var getProductId = function getProductId($form) {
    return parseInt($form.data('product_id'), 10) || 0;
  };

  /**
   * Build a unique notice DOM ID for a product.
   *
   * @param {number} productId Product ID.
   * @return {string} DOM ID.
   */
  var getNoticeId = function getNoticeId(productId) {
    return "".concat(noticeIdPrefix).concat(productId);
  };

  /**
   * Resolve scroll offset.
   *
   * Allows themes to account for sticky headers via PHP localization.
   *
   * @return {number} Scroll offset in pixels.
   */
  var getScrollOffset = function getScrollOffset() {
    var offset = typeof botigaVariationNotice !== 'undefined' && botigaVariationNotice.scrollOffset ? parseInt(botigaVariationNotice.scrollOffset, 10) : 0;
    return Number.isFinite(offset) ? offset : 0;
  };

  /**
   * Get localized list separator.
   *
   * @return {string}
   */
  var getListSeparator = function getListSeparator() {
    if (typeof botigaVariationNotice !== 'undefined' && typeof botigaVariationNotice.listSeparator === 'string') {
      return botigaVariationNotice.listSeparator;
    }
    return ', ';
  };

  /**
   * Join labels in a natural-language list.
   *
   * @param {string[]} items List items.
   * @return {string}
   */
  var joinLabels = function joinLabels(items) {
    var separator = getListSeparator();
    var conjunction = typeof botigaVariationNotice !== 'undefined' && typeof botigaVariationNotice.listConjunction === 'string' ? botigaVariationNotice.listConjunction : ' and ';
    if (items.length <= 1) {
      return items.join('');
    }
    if (items.length === 2) {
      return "".concat(items[0]).concat(conjunction).concat(items[1]);
    }
    return "".concat(items.slice(0, -1).join(separator)).concat(conjunction).concat(items[items.length - 1]);
  };

  /**
   * Get localized missing-selection message template.
   *
   * Expected to contain a single `%s` placeholder.
   *
   * @return {string}
   */
  var getMissingMessageTemplate = function getMissingMessageTemplate() {
    if (typeof botigaVariationNotice !== 'undefined' && typeof botigaVariationNotice.missingMessage === 'string') {
      return botigaVariationNotice.missingMessage;
    }
    return 'Please select: %s.';
  };

  /**
   * Resolve fallback message.
   *
   * Prefers WooCommerce i18n text when available.
   *
   * @return {string}
   */
  var getFallbackMessage = function getFallbackMessage() {
    if (typeof wc_add_to_cart_variation_params !== 'undefined' && typeof wc_add_to_cart_variation_params.i18n_make_a_selection_text === 'string') {
      return wc_add_to_cart_variation_params.i18n_make_a_selection_text;
    }
    if (typeof botigaVariationNotice !== 'undefined' && typeof botigaVariationNotice.fallbackMessage === 'string') {
      return botigaVariationNotice.fallbackMessage;
    }
    return 'Please select all required options before adding this product to your cart.';
  };

  /**
   * Minimal sprintf helper.
   *
   * @param {string} template String with `%s`.
   * @param {string} value Replacement value.
   * @return {string}
   */
  var sprintfOne = function sprintfOne(template, value) {
    return template.replace(/%s/g, value);
  };

  /**
   * Collect labels for unselected variation attributes.
   *
   * Labels are taken directly from the DOM so they are
   * already translated by WooCommerce/theme.
   *
   * @param {jQuery} $form Variation form.
   * @return {string[]} Unique list of labels.
   */
  var getMissingLabels = function getMissingLabels($form) {
    var missing = [];
    $form.find('.variations select').each(function () {
      var $select = $(this);
      if ($select.val()) {
        return;
      }
      var selectId = $select.attr('id');
      var labelText = '';
      if (selectId) {
        labelText = $form.find("label[for=\"".concat(selectId, "\"]")).first().text().trim();
      }
      if (!labelText) {
        var attrName = $select.data('attribute_name') || $select.attr('name') || '';
        labelText = attrName.toString().replace(/^attribute_/, '').replace(/^pa_/, '').replace(/[-_]+/g, ' ').trim().replace(/\b\w/g, function (char) {
          return char.toUpperCase();
        });
      }
      if (labelText) {
        missing.push(labelText);
      }
    });
    return Array.from(new Set(missing));
  };

  /**
   * Build final notice message.
   *
   * @param {jQuery} $form Variation form.
   * @return {string}
   */
  var buildMessage = function buildMessage($form) {
    var missing = getMissingLabels($form);
    if (!missing.length) {
      return getFallbackMessage();
    }
    var list = joinLabels(missing);
    return sprintfOne(getMissingMessageTemplate(), list);
  };

  /**
   * Remove existing notice for a product.
   *
   * @param {number} productId Product ID.
   */
  var removeNotice = function removeNotice(productId) {
    if (productId) {
      $("#".concat(getNoticeId(productId))).remove();
    }
  };

  /**
   * Check whether notice should be displayed.
   *
   * @param {number} productId Product ID.
   * @return {boolean}
   */
  var shouldShow = function shouldShow(productId) {
    return productId && showNoticeByProductId.get(productId) === true;
  };

  /**
   * Scroll viewport to the variation form.
   *
   * The notice is placed *below* the form, so scrolling
   * to the form ensures the notice becomes visible.
   *
   * @param {HTMLElement} formEl Form element.
   */
  var scrollToForm = function scrollToForm(formEl) {
    if (!formEl || !formEl.getBoundingClientRect) {
      return;
    }
    var rect = formEl.getBoundingClientRect();
    var offset = getScrollOffset();
    var targetY = Math.max(0, (window.scrollY || window.pageYOffset) + rect.top - offset);
    window.scrollTo({
      top: targetY,
      behavior: 'smooth'
    });
  };

  /**
   * Render inline WooCommerce-style notice.
   *
   * @param {jQuery} $form Variation form.
   * @return {jQuery|null}
   */
  var renderNotice = function renderNotice($form) {
    var productId = getProductId($form);
    if (!productId || !shouldShow(productId)) {
      return null;
    }
    if (getMissingLabels($form).length === 0) {
      return null;
    }
    removeNotice(productId);
    var $notice = $("<div id=\"".concat(getNoticeId(productId), "\">\n\t\t\t\t<p class=\"woocommerce-error\" role=\"alert\" tabindex=\"-1\">\n\t\t\t\t\t").concat(buildMessage($form), "\n\t\t\t\t</p>\n\t\t\t</div>"));
    $form.after($notice);
    return $notice;
  };

  /**
   * Request notice display for a form.
   *
   * @param {jQuery} $form Variation form.
   */
  var requestNotice = function requestNotice($form) {
    var productId = getProductId($form);
    if (!productId) {
      return;
    }
    showNoticeByProductId.set(productId, true);
    var $notice = renderNotice($form);
    scrollToForm($form.get(0));
    if ($notice) {
      window.setTimeout(function () {
        $notice.find('p.woocommerce-error').trigger('focus');
      }, 250);
    }
  };

  /**
   * Clear notice state for a form.
   *
   * @param {jQuery} $form Variation form.
   */
  var clearNotice = function clearNotice($form) {
    var productId = getProductId($form);
    if (productId) {
      showNoticeByProductId.set(productId, false);
      removeNotice(productId);
    }
  };

  /**
   * Detect whether any variation selections are missing.
   *
   * @param {HTMLElement} formEl Variation form.
   * @return {boolean}
   */
  var variationsMissing = function variationsMissing(formEl) {
    return Array.from(formEl.querySelectorAll('.variations select')).some(function (select) {
      return !select.value;
    });
  };

  /**
   * Capture-phase click blocker.
   *
   * Prevents WooCommerce alert() and form submission
   * for Add to Cart and Buy Now buttons.
   */
  var attachCaptureBlocker = function attachCaptureBlocker() {
    if (window.__botigaVariationSelectionCaptureAttached) {
      return;
    }
    window.__botigaVariationSelectionCaptureAttached = true;
    document.addEventListener('click', function (event) {
      var button = event.target.closest('form.variations_form .single_add_to_cart_button, ' + 'form.variations_form .botiga-buy-now-button');
      if (!button) {
        return;
      }
      var formEl = button.closest('form.variations_form');
      if (!formEl || !variationsMissing(formEl)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      formEl.dispatchEvent(new CustomEvent('botiga:variation-selection-needed', {
        bubbles: true
      }));
    }, true);
  };

  /**
   * Event bindings.
   */
  $(document).on('botiga:variation-selection-needed', 'form.variations_form', function () {
    requestNotice($(this));
  }).on('change', 'form.variations_form .variations select', function () {
    var $form = $(this).closest('form.variations_form');
    if (getMissingLabels($form).length === 0) {
      clearNotice($form);
      return;
    }
    if (shouldShow(getProductId($form))) {
      renderNotice($form);
    }
  });

  /**
   * Initialize observers.
   */
  $(function () {
    attachCaptureBlocker();
  });
})(jQuery, window, document);