package model

type NodeComposeProjectVariable struct {
	Name                 string `gorm:"size:100"`
	Value                string
	NodeComposeProject   NodeComposeProject
	Id                   uint
	NodeComposeProjectId uint
	IsSecret             bool
}
