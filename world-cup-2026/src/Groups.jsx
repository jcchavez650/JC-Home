import TeamFlag from './TeamFlag.jsx'
import { useLang } from './LangContext.jsx'

export default function Groups({ groups }) {
  const { t } = useLang()
  if (!groups.length) {
    return (
      <div className="empty">
        <div className="e">📊</div>
        {t.noGroups}
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 12 }}>
      {groups.map(g => <GroupTable key={g.name} group={g} />)}
    </div>
  )
}

function GroupTable({ group }) {
  const { t, tn } = useLang()
  return (
    <div className="group-card">
      <div className="group-title">{t.group} {group.name}</div>
      <table className="standings-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>{t.gp}</th>
            <th>{t.w}</th>
            <th>{t.d}</th>
            <th>{t.l}</th>
            <th>{t.gd}</th>
            <th>{t.pts}</th>
          </tr>
        </thead>
        <tbody>
          {group.teams.map((team, i) => (
            <tr key={team.team} className={i < 2 ? 'advance' : ''}>
              <td>
                <div className="team-row">
                  <span className={`pos-num ${i < 2 ? 'top' : ''}`}>{i + 1}</span>
                  <TeamFlag abbr={team.abbr} logo={team.logo} size={22} />
                  <span style={{ fontSize: 12 }}>{tn(team.team, team.abbr)}</span>
                </div>
              </td>
              <td>{team.gp}</td>
              <td>{team.w}</td>
              <td>{team.d}</td>
              <td>{team.l}</td>
              <td style={{ color: team.gd > 0 ? 'var(--green)' : team.gd < 0 ? 'var(--red)' : 'inherit' }}>
                {team.gd > 0 ? `+${team.gd}` : team.gd}
              </td>
              <td className="pts-bold">{team.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
