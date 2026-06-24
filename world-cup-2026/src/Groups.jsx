export default function Groups({ groups }) {
  if (!groups.length) {
    return (
      <div className="empty">
        <div className="e">📊</div>
        Group standings not available yet.
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 12 }}>
      {groups.map(g => (
        <GroupTable key={g.name} group={g} />
      ))}
    </div>
  )
}

function GroupTable({ group }) {
  return (
    <div className="group-card">
      <div className="group-title">Group {group.name}</div>
      <table className="standings-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>GP</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GD</th>
            <th>PTS</th>
          </tr>
        </thead>
        <tbody>
          {group.teams.map((t, i) => (
            <tr key={t.team} className={i < 2 ? 'advance' : ''}>
              <td>
                <div className="team-row">
                  <span className={`pos-num ${i < 2 ? 'top' : ''}`}>{i + 1}</span>
                  <span className="flag-sm">{t.flag}</span>
                  <span style={{ fontSize: 12 }}>{t.team}</span>
                </div>
              </td>
              <td>{t.gp}</td>
              <td>{t.w}</td>
              <td>{t.d}</td>
              <td>{t.l}</td>
              <td style={{ color: t.gd > 0 ? 'var(--green)' : t.gd < 0 ? 'var(--red)' : 'inherit' }}>
                {t.gd > 0 ? `+${t.gd}` : t.gd}
              </td>
              <td className="pts-bold">{t.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
