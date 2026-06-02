import { readFileSync, writeFileSync } from 'fs'

const file = 'd:/!Project/Zencos_NVL/src/pages/ProductionBomPage.tsx'
let s = readFileSync(file, 'utf8')

// Find the footer and the last </article> before it
const footerIdx = s.indexOf('<footer className=')
const articleEnd = s.lastIndexOf('      </article>', footerIdx)
console.log('article end at:', articleEnd, 'footer at:', footerIdx)
console.log('gap between:', JSON.stringify(s.slice(articleEnd + 16, footerIdx)))

// The gap is the comment line between article and footer
// We want to:
//  - insert "        </div>{/* /inbound-step-main */}\n\n        <aside ...>\n        </aside>\n      </div>{/* /inbound-step-layout-with-history */}\n\n"
//  before the footer comment+footer element

const insertBefore = footerIdx
const historyPanel = `        </div>{/* /inbound-step-main */}\r\n\r\n        <aside className="inbound-step-history-panel">\r\n          <div className="inbound-step4-section-header">\r\n            <i className="pi pi-history" />\r\n            <span>LỊCH SỬ THAO TÁC</span>\r\n          </div>\r\n          {id && id !== 'new' ? (\r\n            <HistoryTimeline\r\n              events={historyEvents}\r\n              loading={historyLoading}\r\n              error={historyError}\r\n              emptyMessage="Chưa có lịch sử thao tác cho phiếu định mức này."\r\n            />\r\n          ) : (\r\n            <p className="purchase-side-note">Lịch sử thao tác sẽ hiển thị sau khi lưu phiếu nháp lần đầu.</p>\r\n          )}\r\n        </aside>\r\n      </div>{/* /inbound-step-layout-with-history */}\r\n\r\n      `

// Find start of the gap (right after </article>)
const gapStart = articleEnd + 16  // length of '      </article>'
// We'll insert the panel between </article> and the comment
s = s.slice(0, gapStart) + '\r\n' + historyPanel + s.slice(gapStart)

writeFileSync(file, s, 'utf8')
console.log('Done — history panel inserted.')
