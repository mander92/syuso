import './DataProcessingNotice.css';

const rights = [
    'Acceso a tus datos personales.',
    'Rectificación de datos incompletos o incorrectos.',
    'Supresión cuando proceda legalmente.',
    'Limitación u oposición en los casos previstos por la normativa.',
    'Reclamación ante la Agencia Española de Protección de Datos.',
];

const processedData = [
    'Datos identificativos y de contacto.',
    'Datos laborales, documentación de alta, firmas y documentos asociados.',
    'Cuadrantes, turnos, servicios asignados, partes de trabajo y comunicaciones internas.',
    'Registro horario de entrada y salida, incluyendo ubicación técnica del fichaje cuando se use.',
    'Notificaciones operativas necesarias para el funcionamiento de la app.',
];

const DataProcessingNotice = () => (
    <section className='data-processing'>
        <header className='data-processing__header'>
            <div>
                <p className='data-processing__eyebrow'>Información RGPD</p>
                <h2>Tratamiento de datos personales</h2>
            </div>
            <span>SYUSO Seguridad, S.L.</span>
        </header>

        <div className='data-processing__grid'>
            <article className='data-processing__card'>
                <h3>Responsable</h3>
                <p>
                    SYUSO Seguridad, S.L. trata tus datos para gestionar la
                    relación laboral, la operativa diaria y las obligaciones
                    legales vinculadas al servicio.
                </p>
            </article>

            <article className='data-processing__card'>
                <h3>Finalidades</h3>
                <p>
                    Gestión de trabajadores, servicios, cuadrantes, fichajes,
                    partes de trabajo, documentación laboral, comunicaciones,
                    notificaciones y control horario.
                </p>
            </article>

            <article className='data-processing__card'>
                <h3>Base jurídica</h3>
                <p>
                    Ejecución de la relación laboral, cumplimiento de
                    obligaciones legales y organización empresarial. El registro
                    horario no requiere consentimiento porque responde a una
                    obligación legal.
                </p>
            </article>

            <article className='data-processing__card'>
                <h3>Conservación</h3>
                <p>
                    Los registros de jornada se conservan durante cuatro años y
                    quedan disponibles para la persona trabajadora, sus
                    representantes legales y la Inspección de Trabajo. El resto
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
            <h3>Accesos y destinatarios</h3>
            <p>
                El acceso queda limitado a personal autorizado y a proveedores
                técnicos necesarios para prestar el servicio. Los datos podrán
                comunicarse a administraciones públicas, Inspección de Trabajo,
                asesorías o terceros cuando exista obligación legal o sea
                necesario para la gestión laboral.
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
                AEPD: registro horario y protección de datos
            </a>
        </footer>
    </section>
);

export default DataProcessingNotice;
