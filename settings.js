/* mk-admin-theme – settings.js */
(function ($) {
    'use strict';

    var i18n = (typeof mkAdminTheme !== 'undefined' && mkAdminTheme.i18n) ? mkAdminTheme.i18n : {};
    var t = function (key, fallback) { return i18n[key] || fallback; };

    // ── Shared color picker options ───────────────────────────────────────────

    var sharedPickerOptions = {
        l10n: { pick: t('selectColor', '🎨'), defaultLabel: t('selectColor', '🎨') }
    };

    if (
        typeof mkAdminTheme !== 'undefined' &&
        mkAdminTheme.elementorPalette &&
        mkAdminTheme.elementorPalette.length > 0
    ) {
        sharedPickerOptions.palettes = mkAdminTheme.elementorPalette;
    }

    var themeOptions = $.extend({}, sharedPickerOptions, {
        change: function () { mkAdminThemeLivePreview(); },
        clear:  function () { mkAdminThemeLivePreview(); }
    });

    function initPalettePickers($scope) {
        $scope.find('.mk-color-picker').each(function () {
            if (!$(this).hasClass('wp-color-picker')) {
                $(this).wpColorPicker(themeOptions);
            }
        });
    }

    // ── Live preview (reads from currently visible palette panel) ─────────────

    function mkAdminThemeLivePreview() {
        var $panel = $('.mk-palette-panel:visible');
        if (!$panel.length) { return; }

        var vars = ':root {';
        var map = {
            'bg_base':                    '--mk-bg-base',
            'color_primary':              '--mk-color-primary',
            'color_accent':               '--mk-color-accent',
            'color_accent_text':          '--mk-color-accent-text',
            'bg_topbar':                  '--mk-bg-topbar',
            'text_topbar':                '--mk-text-topbar',
            'bg_menu':                    '--mk-bg-menu',
            'bg_menu_hover':              '--mk-bg-menu-hover',
            'bg_menu_current':            '--mk-bg-menu-current',
            'bg_menu_current_hover':      '--mk-bg-menu-current-hover',
            'text_menu':                  '--mk-text-menu',
            'text_menu_current':          '--mk-text-menu-current',
            'color_link':                 '--mk-color-link',
            'color_button_primary_bg':    '--mk-btn-primary-bg',
            'color_button_primary_text':  '--mk-btn-primary-text',
            'color_button_secondary_bg':  '--mk-btn-secondary-bg',
            'color_button_secondary_text':'--mk-btn-secondary-text',
        };

        $.each(map, function (key, cssVar) {
            var val = $panel.find('input[name$="[' + key + ']"]').val();
            if (val) { vars += cssVar + ':' + val + ';'; }
        });

        vars += '}';

        var styleTag = document.getElementById('mk-live-preview');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'mk-live-preview';
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = vars;
    }

    // ── Theme settings page ───────────────────────────────────────────────────

    $(document).ready(function () {

        // Init pickers on all existing palette panels
        initPalettePickers($('#mk-palettes-wrapper, .mk-palette-panel'));

        // ── Palette tabs ──────────────────────────────────────────────────────

        $(document).on('click', '.mk-tab', function () {
            var idx = $(this).data('idx');
            $('.mk-tab').removeClass('mk-tab-active');
            $(this).addClass('mk-tab-active');
            $('.mk-palette-panel').hide();
            $('.mk-palette-panel[data-idx="' + idx + '"]').show();
            mkAdminThemeLivePreview();
        });

        // Update tab label when name input changes
        $(document).on('input', '.mk-palette-name-input', function () {
            var $panel = $(this).closest('.mk-palette-panel');
            var idx    = $panel.data('idx');
            var name   = $(this).val().trim() || 'Palette ' + (parseInt(idx, 10) + 1);
            $('.mk-tab[data-idx="' + idx + '"]').text(name);
        });

        // ── Add palette ───────────────────────────────────────────────────────

        $('#mk-palette-add').on('click', function () {
            var idx = $('.mk-palette-panel').length;
            var tpl = $('#mk-palette-tpl').html();
            tpl = tpl.replace(/__IDX__/g, idx);
            var $panel = $(tpl);

            // Append panel before the template script tag
            $('#mk-palette-tpl').before($panel);

            // Add tab button
            var label = 'Palette ' + (idx + 1);
            var $tab  = $('<button type="button" class="mk-tab" data-idx="' + idx + '">' + label + '</button>');
            $(this).before($tab);

            // Init color pickers on new panel
            initPalettePickers($panel);

            // Switch to new tab
            $tab.trigger('click');
        });

        // ── Delete palette ────────────────────────────────────────────────────

        $(document).on('click', '.mk-palette-delete', function () {
            if ($('.mk-palette-panel').length <= 1) {
                alert('Almeno una palette è richiesta.');
                return;
            }
            if (!confirm('Eliminare questa palette?')) { return; }

            var $panel = $(this).closest('.mk-palette-panel');
            var idx    = $panel.data('idx');

            $panel.remove();
            $('.mk-tab[data-idx="' + idx + '"]').remove();

            reindexPalettes();

            // If no active radio is checked, check index 0
            if (!$('input[name="mk_admin_theme_options[active_palette]"]:checked').length) {
                $('input[name="mk_admin_theme_options[active_palette]"][value="0"]').prop('checked', true);
            }

            // Switch to first tab
            $('.mk-tab').first().trigger('click');
        });

        function reindexPalettes() {
            $('.mk-palette-panel').each(function (newIdx) {
                var $panel = $(this);
                $panel.attr('data-idx', newIdx);

                // Rename all field names: mk_admin_theme_palettes[old][key] → [newIdx][key]
                $panel.find('[name*="mk_admin_theme_palettes["]').each(function () {
                    this.name = this.name.replace(
                        /mk_admin_theme_palettes\[\d+\]/,
                        'mk_admin_theme_palettes[' + newIdx + ']'
                    );
                });

                // Update IDs
                $panel.find('[id*="_pal_"]').each(function () {
                    this.id = this.id.replace(/_pal_\d+_/, '_pal_' + newIdx + '_');
                });

                // Update label for attributes
                $panel.find('label[for*="_pal_"]').each(function () {
                    this.htmlFor = this.htmlFor.replace(/_pal_\d+_/, '_pal_' + newIdx + '_');
                });

                // Update active_palette radio value
                $panel.find('input[name="mk_admin_theme_options[active_palette]"]').val(newIdx);
            });

            // Update tab data-idx
            $('.mk-tab').each(function (newIdx) {
                $(this).attr('data-idx', newIdx);
            });
        }

        // Initial live preview
        mkAdminThemeLivePreview();
    });

    // ── ACF Custom Styles page ────────────────────────────────────────────────

    var acfPickerOptions = $.extend({}, sharedPickerOptions, {
        change: function () { setTimeout(updateAcfCssPreview, 50); },
        clear:  function () { setTimeout(updateAcfCssPreview, 50); }
    });

    function initAcfColorPickers($scope) {
        $scope.find('.mk-acf-color-picker').each(function () {
            if (!$(this).hasClass('wp-color-picker')) {
                $(this).wpColorPicker(acfPickerOptions);
            }
        });
    }

    initAcfColorPickers($(document));

    // Slug preview.
    $(document).on('input', '.mk-acf-slug-input', function () {
        var val = $(this).val().replace(/\s+/g, '-');
        $(this).val(val);
        $(this).siblings('.mk-acf-slug-preview').text(val ? '.' + val : '');
        updateAcfCssPreview();
    });

    // Custom CSS textarea triggers preview update.
    $(document).on('input', '.mk-acf-custom-css', function () {
        updateAcfCssPreview();
    });

    // Radius field triggers preview update.
    $(document).on('input', '#mk_acf_styles_radius', function () {
        updateAcfCssPreview();
    });

    // Add row.
    var acfRowIndex = $('#mk-acf-presets-body .mk-acf-preset-row').length;

    $('#mk-acf-add-row').on('click', function () {
        var template = $('#mk-acf-row-template').html();
        template = template.replace(/__INDEX__/g, acfRowIndex++);

        var $emptyRow = $('#mk-acf-presets-body .mk-acf-empty-row');
        if ($emptyRow.length) { $emptyRow.remove(); }

        var $row = $(template);
        $('#mk-acf-presets-body').append($row);
        initAcfColorPickers($row);
    });

    // Remove row.
    var emptyColspan = $('#mk-acf-presets-table thead tr th').length;
    $(document).on('click', '.mk-acf-remove-row', function () {
        $(this).closest('tr').remove();
        if ($('#mk-acf-presets-body .mk-acf-preset-row').length === 0) {
            $('#mk-acf-presets-body').html(
                '<tr class="mk-acf-empty-row"><td colspan="' + emptyColspan + '"><em>' +
                t('noClass', 'Nessuna classe.') + '</em></td></tr>'
            );
        }
        updateAcfCssPreview();
    });

    // Generate and display the CSS preview.
    function updateAcfCssPreview() {
        var r   = ($('#mk_acf_styles_radius').val() || '6') + 'px';
        var css = ':root { --mk-acf-radius: ' + r + '; }\n\n';

        $('#mk-acf-presets-body .mk-acf-preset-row').each(function () {
            var $row = $(this);
            var slug = $row.find('.mk-acf-slug-input').val().trim();
            if (!slug) { return; }

            var getColor = function (name) {
                return $row.find('input[name*="[' + name + ']"]').val() || '';
            };

            var s          = '.' + slug;
            var acfLabelBg = getColor('acf_label_bg');
            var labelBg    = getColor('label_bg');
            var fieldBg    = getColor('field_bg');
            var titleColor = getColor('title_color');
            var labelColor = getColor('label_color');
            var descColor  = getColor('desc_color');
            var customCss  = $row.find('.mk-acf-custom-css').val().trim();

            if (fieldBg) {
                css += s + ' { background-color: ' + fieldBg + ' !important; border-radius: var(--mk-acf-radius); }\n';
            }
            if (acfLabelBg) {
                css += s + ' > .acf-label { background-color: ' + acfLabelBg + ' !important; border-radius: var(--mk-acf-radius); padding: 2px 5px; }\n';
            }
            if (labelBg) {
                css += s + ' > .acf-label label { background-color: ' + labelBg + ' !important; border-radius: var(--mk-acf-radius); padding: 5px; display: inline; }\n';
            }
            if (titleColor) {
                css += s + ' > .acf-label label { color: ' + titleColor + ' !important; }\n';
            }
            if (labelColor) {
                css += s + ' .acf-label label { color: ' + labelColor + ' !important; }\n';
            }
            if (descColor) {
                css += s + ' .acf-field p.description { color: ' + descColor + ' !important; }\n';
            }
            if (acfLabelBg) {
                css += s + ' .acf-field p.description { background-color: ' + acfLabelBg + ' !important; border-radius: var(--mk-acf-radius); }\n';
            }
            if (customCss) {
                css += '/* custom: ' + s + ' */\n' + customCss + '\n';
            }
            css += '\n';
        });

        var $preview = $('#mk-acf-css-preview');
        if ($preview.length) { $preview.val(css.trim() || '/* Nessuna classe definita */'); }
    }

    if ($('#mk-acf-presets-body').length) {
        updateAcfCssPreview();
    }

    // ── Media uploader ────────────────────────────────────────────────────────

    $(document).on('click', '.mk-media-upload', function (e) {
        e.preventDefault();
        var target = $($(this).data('target'));
        var frame = wp.media({
            title:    t('mediaTitle',  'Seleziona immagine'),
            button: { text: t('mediaButton', 'Usa questa immagine') },
            multiple: false
        });
        frame.on('select', function () {
            var attachment = frame.state().get('selection').first().toJSON();
            target.val(attachment.url);
        });
        frame.open();
    });

}(jQuery));
