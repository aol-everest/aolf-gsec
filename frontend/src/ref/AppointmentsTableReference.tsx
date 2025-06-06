import React from "react";
import "./AppointmentsTableReference.css";

interface AppointmentsTableReferenceProps {}

const AppointmentsTableReference: React.FC<
  AppointmentsTableReferenceProps
> = () => {
  return (
    <div className="appointments-container">
      <div className="appointments-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="main-title">All Appointments</h1>
            <p className="subtitle">
              Lorem ipsum dolor sit amet consectetur. Iaculis sollicitudin
              pellentesque
            </p>
          </div>
          <div className="view-toggle">
            <button className="view-button active">
              <div className="button-icon" />
              <span>Table view</span>
            </button>
            <button className="view-button">
              <div className="button-icon" />
              <span>Tiles view</span>
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-content">
          {/* Request ID Column */}
          <div className="table-column request-id-column">
            <div className="table-header-cell">
              <div className="table-header">Request ID</div>
            </div>
            <div className="table-cell">#82984</div>
            <div className="table-cell">#12345</div>
            <div className="table-cell">#67890</div>
            <div className="table-cell">#54321</div>
            <div className="table-cell">#98765</div>
            <div className="table-cell">#24680</div>
            <div className="table-cell">#13579</div>
          </div>

          {/* Dignitary Column */}
          <div className="table-column dignitary-column">
            <div className="table-header-cell">
              <div className="table-header">Dignitary</div>
            </div>
            <div className="table-cell">Mr. Liam Schmidt</div>
            <div className="table-cell">Mr. Ethan Carter</div>
            <div className="table-cell">Ms. Ava Thompson</div>
            <div className="table-cell">Mr. Noah Williams</div>
            <div className="table-cell">Mrs. Sophia Johnson</div>
            <div className="table-cell">Mr. Oliver Brown</div>
            <div className="table-cell">Ms. Mia Davis</div>
          </div>

          {/* Requested Date & Time Column */}
          <div className="table-column requested-datetime-column">
            <div className="table-header-cell">
              <div className="table-header">Requested Date & Time</div>
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
          </div>

          {/* Appointment Date & Time Column */}
          <div className="table-column appointment-datetime-column">
            <div className="table-header-cell">
              <div className="table-header">Appointment Date & Time</div>
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
          </div>

          {/* Location Column */}
          <div className="table-column location-column">
            <div className="table-header-cell">
              <div className="table-header">Location</div>
            </div>
            <div className="table-cell">Maplewood</div>
            <div className="table-cell">Maplewood</div>
            <div className="table-cell">Riverside</div>
            <div className="table-cell">Cedar Grove</div>
            <div className="table-cell">Sunnyvale</div>
            <div className="table-cell">Pine Hill</div>
            <div className="table-cell">Boone</div>
          </div>

          {/* Status Column */}
          <div className="table-column status-column">
            <div className="table-header-cell">
              <div className="table-header">Status</div>
            </div>
            <div className="table-cell status-cell">
              <div className="status-badge pending">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/b18a9db941a68e0f83ea48bd41b979d3c1210973?placeholderIfAbsent=true"
                  alt=""
                  className="status-icon"
                />
                <span>Pending</span>
              </div>
            </div>
            <div className="table-cell status-cell">
              <div className="status-badge active">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/0913bfc40096982922966c3cc9fe86163b4c22ee?placeholderIfAbsent=true"
                  alt=""
                  className="status-icon"
                />
                <span>Active</span>
              </div>
            </div>
            <div className="table-cell status-cell">
              <div className="status-badge follow-up">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/64c1cee65bce4d87a76878f122efb9b592de2053?placeholderIfAbsent=true"
                  alt=""
                  className="status-icon"
                />
                <span>Follow up</span>
              </div>
            </div>
            <div className="table-cell status-cell">
              <div className="status-badge active">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/0913bfc40096982922966c3cc9fe86163b4c22ee?placeholderIfAbsent=true"
                  alt=""
                  className="status-icon"
                />
                <span>Active</span>
              </div>
            </div>
            <div className="table-cell status-cell">
              <div className="status-badge pending">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/b18a9db941a68e0f83ea48bd41b979d3c1210973?placeholderIfAbsent=true"
                  alt=""
                  className="status-icon"
                />
                <span>Pending</span>
              </div>
            </div>
            <div className="table-cell status-cell">
              <div className="status-badge rejected">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/91840118148a03df8394c65a5716791e1228c8ea?placeholderIfAbsent=true"
                  alt=""
                  className="status-icon"
                />
                <span>Rejected</span>
              </div>
            </div>
            <div className="table-cell status-cell">
              <div className="status-badge pending">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/b18a9db941a68e0f83ea48bd41b979d3c1210973?placeholderIfAbsent=true"
                  alt=""
                  className="status-icon"
                />
                <span>Pending</span>
              </div>
            </div>
          </div>

          {/* Requested Column */}
          <div className="table-column requested-column">
            <div className="table-header-cell">
              <div className="table-header">Requested</div>
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
          </div>

          {/* Last Updated Column */}
          <div className="table-column last-updated-column">
            <div className="table-header-cell">
              <div className="table-header">Last Updated</div>
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
            <div className="table-cell multiline">
              03/22/2025
              <br />
              11:00 AM
            </div>
          </div>

          {/* Actions Column */}
          <div className="table-column actions-column">
            <div className="table-header-cell">
              <div className="table-header"></div>
            </div>
            <div className="table-cell actions-cell">
              <button className="action-button">
                <div className="edit-icon" />
              </button>
            </div>
            <div className="table-cell actions-cell">
              <button className="action-button">
                <div className="edit-icon" />
              </button>
            </div>
            <div className="table-cell actions-cell">
              <button className="action-button">
                <div className="edit-icon" />
              </button>
            </div>
            <div className="table-cell actions-cell">
              <button className="action-button">
                <div className="edit-icon" />
              </button>
            </div>
            <div className="table-cell actions-cell">
              <button className="action-button">
                <div className="edit-icon" />
              </button>
            </div>
            <div className="table-cell actions-cell">
              <button className="action-button">
                <div className="edit-icon" />
              </button>
            </div>
            <div className="table-cell actions-cell">
              <button className="action-button">
                <div className="edit-icon" />
              </button>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <div className="pagination-button-wrap left">
            <button className="pagination-button">
              <div className="arrow-left-icon" />
              <span>Previous</span>
            </button>
          </div>

          <div className="pagination-numbers">
            <div className="pagination-number active">
              <div className="pagination-content">1</div>
            </div>
            <div className="pagination-number">
              <div className="pagination-content">2</div>
            </div>
            <div className="pagination-number">
              <div className="pagination-content">3</div>
            </div>
            <div className="pagination-number">
              <div className="pagination-content">...</div>
            </div>
            <div className="pagination-number">
              <div className="pagination-content">8</div>
            </div>
            <div className="pagination-number">
              <div className="pagination-content">9</div>
            </div>
            <div className="pagination-number">
              <div className="pagination-content">10</div>
            </div>
          </div>

          <div className="pagination-button-wrap right">
            <button className="pagination-button">
              <span>Next</span>
              <div className="arrow-right-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsTableReference;
