import './DataProcessingNotice.css';

const rights = [
    'Acceso a tus datos personales.',
    'Rectificacion de datos incompletos o incorrectos.',
    'Supresion cuando proceda legalmente.',
    'Limitacion u oposicion en los casos previstos por la normativa.',
    'Reclamacion ante la Agencia Espanola de Proteccion de Datos.',
];

const processedData = [
    'Datos identificativos y de contacto.',
    'Datos laborales, documentacion de alta, firmas y documentos asociados.',
    'Cuadrantes, turnos, servicios asignados, partes de trabajo y comunicaciones internas.',
    'Registro horario de entrada y salida, incluyendo ubicacion tecnica puntual del fichaje cuando se use.',
    'Informes de registro horario, incidencias, correcciones y acuses relacionados.',
    'Notificaciones operativas necesarias para el funcionamiento de la app.',
];

const DataProcessingNotice = () => (
    <section className='data-processing'>
        <header className='data-processing__header'>
            <div>
                <p className='data-processing__eyebrow'>Informacion RGPD</p>
                <h2>Tratamiento de datos personales</h2>
            </div>
            <span>SYUSO Seguridad, S.L.</span>
        </header>

        <div className='data-processing__grid'>
            <article className='data-processing__card'>
                <h3>Responsable</h3>
                <p>
                    SYUSO Seguridad, S.L. trata tus datos para gestionar la
                    relacion laboral, la operativa diaria y las obligaciones
                    legales vinculadas al servicio.
                </p>
            </article>

            <article className='data-processing__card'>
                <h3>Finalidades</h3>
                <p>
                    Gestion de trabajadores, servicios, cuadrantes, fichajes,
                    partes de trabajo, documentacion laboral, comunicaciones,
                    notificaciones y control horario.
                </p>
            </article>

            <article className='data-processing__card'>
                <h3>Base juridica</h3>
                <p>
                    Ejecucion de la relacion laboral, cumplimiento de
                    obligaciones legales y organizacion empresarial. El registro
                    horario no requiere consentimiento porque responde a una
                    obligacion legal.
                </p>
            </article>

            <article className='data-processing__card'>
                <h3>Conservacion</h3>
                <p>
                    Los registros de jornada se conservan durante cuatro anos y
                    quedan disponibles para la persona trabajadora, sus
                    representantes legales y la Inspeccion de Trabajo. El resto
                    de datos se conserva durante los plazos legales aplicables.
                </p>
            </article>
        </div>

        <section className='data-processing__panel'>
            <h3>Datos que puede tratar la app</h3>
            <ul>
                {processedData.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </section>

        <section className='data-processing__panel'>
            <h3>Registro horario y ubicacion</h3>
            <p>
                El registro horario documenta la hora concreta de inicio y fin
                de jornada. Cuando el dispositivo lo permita, la app puede
                guardar la ubicacion puntual de entrada y salida para acreditar
                el fichaje; no se realiza seguimiento continuo de la posicion.
            </p>
            <p>
                Cada persona trabajadora puede consultar su registro horario
                mensual desde su panel. Las correcciones e incidencias deben
                quedar documentadas para que el informe sea entendible y
                verificable.
            </p>
        </section>

        <section className='data-processing__panel'>
            <h3>Accesos y destinatarios</h3>
            <p>
                El acceso queda limitado a personal autorizado y a proveedores
                tecnicos necesarios para prestar el servicio. Los datos podran
                comunicarse a administraciones publicas, Inspeccion de Trabajo,
                asesorias o terceros cuando exista obligacion legal o sea
                necesario para la gestion laboral.
            </p>
        </section>

        <section className='data-processing__panel'>
            <h3>Tus derechos</h3>
            <ul>
                {rights.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
            <p>
                Puedes ejercerlos contactando con la empresa por los canales
                internos habituales o en el correo indicado por SYUSO para
                comunicaciones de privacidad.
            </p>
        </section>

        <footer className='data-processing__sources'>
            <a
                href='https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430'
                target='_blank'
                rel='noreferrer'
            >
                Estatuto de los Trabajadores, art. 34.9
            </a>
            <a
                href='https://www.aepd.es/preguntas-frecuentes/3-proteccion-de-datos-en-el-ambito-laboral/FAQ-0311-es-necesario-el-consentimiento-del-trabajador-para-implantar-un-sistema-de-control-horario'
                target='_blank'
                rel='noreferrer'
            >
                AEPD: registro horario y proteccion de datos
            </a>
        </footer>
    </section>
);

export default DataProcessingNotice;
