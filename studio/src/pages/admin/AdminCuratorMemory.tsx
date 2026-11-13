import CuratorFilesManager from '../../components/CuratorFilesManager'

// AI-куратордың жады: барлық сабақ пен чатқа жалпы файлдар. Әр сабаққа жеке файл — сабақты «Редакциялау» арқылы.
export default function AdminCuratorMemory() {
  return (
    <div className="panel">
      <h3 style={{ marginBottom: 8 }}>AI-куратордың жады</h3>
      <p className="small muted" style={{ marginBottom: 12 }}>
        Куратор ЖИ мен ақылы API қолданбайды: оқушының сұрағындағы кілт сөздер бойынша осы файлдардан жауап іздейді. Бірнеше файл қоссаңыз, бәрінен бірден іздейді.
      </p>
      <CuratorFilesManager lessonId={null} />
    </div>
  )
}
