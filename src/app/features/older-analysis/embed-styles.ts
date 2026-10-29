/**
 * Injected into the older-analysis document so it flows as one bounded,
 * scrollable page: hides its own navigation chrome and reveals every panel.
 */
export const EMBED_STYLES = `
html{height:auto!important;min-height:0!important;overflow-x:hidden!important;overflow-y:auto!important;scroll-behavior:auto!important}
body{height:auto!important;min-height:0!important;margin:0!important;padding:12px!important;overflow:visible!important;background:#0a1e2b!important;background-image:none!important;background-attachment:scroll!important}
body #gtrWorkspace,body #gtrReturn,.side-nav,.back-to-top,.toc-jump-panel,#dashboardModeToolbar,#tourBar,#boot-intro{display:none!important}
dialog:not([open]),[hidden]{display:none!important}
.reveal,.reveal:not(.in-view){opacity:1!important;visibility:visible!important;transform:none!important;transition:none!important}
.panel.hidden-panel,.panel.mode-hidden{display:block!important;opacity:1!important;visibility:visible!important}
#currentGISReview .shell{min-height:0!important;height:auto!important}
#currentGISReview .sidebar{position:relative!important;inset:auto!important}
.mode-toolbar,.toc-jump-head,#assetRegister .ar-detail{position:static!important}
#history-notice{position:static!important;margin:0 0 16px!important}
main,.main,.main-content{margin-left:0!important;max-width:100%!important}
*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;
