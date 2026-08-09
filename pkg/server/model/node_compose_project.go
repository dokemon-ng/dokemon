package model

type NodeComposeProject struct {
	LibraryProjectName *string `gorm:"size:50"`
	LibraryProject     *ComposeLibraryItem
	Definition         *string
	EnvironmentId      *uint
	Environment        *Environment
	LibraryProjectId   *uint
	Url                *string `gorm:"size:255"`
	CredentialId       *uint
	Credential         *Credential
	Type               string `gorm:"size:20,default:''"`
	ProjectName        string `gorm:"size:50"`
	Node               Node
	NodeId             uint
	Id                 uint
}
